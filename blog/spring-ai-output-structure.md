---
title: Spring AI 源码解析：output-structured调用流程及示例
tags: [Spring AI, Spring AI Alibaba, Output Structured, LLM]
description: "格式化输出：LLM生成的结构化输出对于依赖可靠解析输出值的后续应用程序是否重要，将AI模型的结果转换为特定的数据类型（JSON、Java类等），方便传递到其他应用程序函数和方法"
authors: [GTyingzi]
date: "2025-04-08"
slug: spring-ai-output-structure
category: article
---

详情可见 [spring-ai-alibaba-examples](https://github.com/springaialibaba/spring-ai-alibaba-examples) 项目下的 spring-ai-alibaba-structured-example 模块


## 理论部分

大模型转换数据结构流程图
![](/img/blog/spring-ai-output-structure/data_flow.png)

Map、Bean、List转换器的底层实现

![](/img/blog/spring-ai-output-structure/convert_base.png)

### FormatProvider（格式提供接口）

```Java
public interface FormatProvider {
    String getFormat();
}
```

实现getFormat方法，得到格式

### Converter（转换接口）

```Java
import org.springframework.lang.Nullable;
import org.springframework.util.Assert;

@FunctionalInterface
public interface Converter<S, T> {
    @Nullable
    T convert(S source);

    default <U> Converter<S, U> andThen(Converter<? super T, ? extends U> after) {
        Assert.notNull(after, "'after' Converter must not be null");
        return (s) -> {
            T initialResult = this.convert(s);
            return initialResult != null ? after.convert(initialResult) : null;
        };
    }
}
```

实现convert方法，从格式S转换为T

### StructuredOutputConverter

```Java
public interface StructuredOutputConverter<T> extends Converter<String, T>, FormatProvider {
}
```

### BeanOutputConverter

对象实例转换器，主要有如下功能

1. 每次在构造器部分时，会调用generateSchema方法，生成对象的jsonSchema
2. getJsonSchemaMap：可获得实例（字段，属性值）的键值对
3. getFormat：输送给大模型的实例格式说明
4. convert：将模型输出的实例字符串转为对象

```Java
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.github.victools.jsonschema.generator.Option;
import com.github.victools.jsonschema.generator.OptionPreset;
import com.github.victools.jsonschema.generator.SchemaGenerator;
import com.github.victools.jsonschema.generator.SchemaGeneratorConfig;
import com.github.victools.jsonschema.generator.SchemaGeneratorConfigBuilder;
import com.github.victools.jsonschema.generator.SchemaVersion;
import com.github.victools.jsonschema.module.jackson.JacksonModule;
import com.github.victools.jsonschema.module.jackson.JacksonOption;
import java.lang.reflect.Type;
import java.util.Map;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.util.JacksonUtils;
import org.springframework.ai.util.LoggingMarkers;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.lang.NonNull;

public class BeanOutputConverter<T> implements StructuredOutputConverter<T> {
    private final Logger logger;
    private final Type type;
    private final ObjectMapper objectMapper;
    private String jsonSchema;

    public BeanOutputConverter(Class<T> clazz) {
        this(ParameterizedTypeReference.forType(clazz));
    }

    public BeanOutputConverter(Class<T> clazz, ObjectMapper objectMapper) {
        this(ParameterizedTypeReference.forType(clazz), objectMapper);
    }

    public BeanOutputConverter(ParameterizedTypeReference<T> typeRef) {
        this((Type)typeRef.getType(), (ObjectMapper)null);
    }

    public BeanOutputConverter(ParameterizedTypeReference<T> typeRef, ObjectMapper objectMapper) {
        this(typeRef.getType(), objectMapper);
    }

    private BeanOutputConverter(Type type, ObjectMapper objectMapper) {
        this.logger = LoggerFactory.getLogger(BeanOutputConverter.class);
        Objects.requireNonNull(type, "Type cannot be null;");
        this.type = type;
        this.objectMapper = objectMapper != null ? objectMapper : this.getObjectMapper();
        this.generateSchema();
    }

    private void generateSchema() {
        JacksonModule jacksonModule = new JacksonModule(new JacksonOption[]{JacksonOption.RESPECT_JSONPROPERTY_REQUIRED, JacksonOption.RESPECT_JSONPROPERTY_ORDER});
        SchemaGeneratorConfigBuilder configBuilder = (new SchemaGeneratorConfigBuilder(SchemaVersion.DRAFT_2020_12, OptionPreset.PLAIN_JSON)).with(jacksonModule).with(Option.FORBIDDEN_ADDITIONAL_PROPERTIES_BY_DEFAULT, new Option[0]);
        SchemaGeneratorConfig config = configBuilder.build();
        SchemaGenerator generator = new SchemaGenerator(config);
        JsonNode jsonNode = generator.generateSchema(this.type, new Type[0]);
        ObjectWriter objectWriter = this.objectMapper.writer((new DefaultPrettyPrinter()).withObjectIndenter((new DefaultIndenter()).withLinefeed(System.lineSeparator())));

        try {
            this.jsonSchema = objectWriter.writeValueAsString(jsonNode);
        } catch (JsonProcessingException var8) {
            this.logger.error("Could not pretty print json schema for jsonNode: {}", jsonNode);
            throw new RuntimeException("Could not pretty print json schema for " + String.valueOf(this.type), var8);
        }
    }

    public T convert(@NonNull String text) {
        try {
            text = text.trim();
            if (text.startsWith("```") && text.endsWith("```")) {
                String[] lines = text.split("\n", 2);
                if (lines[0].trim().equalsIgnoreCase("```json")) {
                    text = lines.length > 1 ? lines[1] : "";
                } else {
                    text = text.substring(3);
                }

                text = text.substring(0, text.length() - 3);
                text = text.trim();
            }

            return this.objectMapper.readValue(text, this.objectMapper.constructType(this.type));
        } catch (JsonProcessingException var3) {
            this.logger.error(LoggingMarkers.SENSITIVE_DATA_MARKER, "Could not parse the given text to the desired target type: \"{}\" into {}", text, this.type);
            throw new RuntimeException(var3);
        }
    }

    protected ObjectMapper getObjectMapper() {
        return ((JsonMapper.Builder)((JsonMapper.Builder)JsonMapper.builder().addModules(JacksonUtils.instantiateAvailableModules())).configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)).build();
    }

    public String getFormat() {
        String template = "Your response should be in JSON format.\nDo not include any explanations, only provide a RFC8259 compliant JSON response following this format without deviation.\nDo not include markdown code blocks in your response.\nRemove the ```json markdown from the output.\nHere is the JSON Schema instance your output must adhere to:\n```%s```\n";
        return String.format(template, this.jsonSchema);
    }

    public String getJsonSchema() {
        return this.jsonSchema;
    }

    public Map<String, Object> getJsonSchemaMap() {
        try {
            return (Map)this.objectMapper.readValue(this.jsonSchema, Map.class);
        } catch (JsonProcessingException var2) {
            this.logger.error("Could not parse the JSON Schema to a Map object", var2);
            throw new IllegalStateException(var2);
        }
    }
}
```

### ListOutputConverter

List转换器

1. getFormat：输送给大模型的List格式说明
2. convert：将模型输出的实例字符串转`List<String>`

```Java
public class ListOutputConverter extends AbstractConversionServiceOutputConverter<List<String>> {
    public ListOutputConverter(DefaultConversionService defaultConversionService) {
        super(defaultConversionService);
    }

    public String getFormat() {
        return "Respond with only a list of comma-separated values, without any leading or trailing text.\nExample format: foo, bar, baz\n";
    }

    public List<String> convert(@NonNull String text) {
        return (List)this.getConversionService().convert(text, List.class);
    }
}
```

#### AbstractConversionServiceOutputConverter

```Java
public abstract class AbstractConversionServiceOutputConverter<T> implements StructuredOutputConverter<T> {
    private final DefaultConversionService conversionService;

    public AbstractConversionServiceOutputConverter(DefaultConversionService conversionService) {
        this.conversionService = conversionService;
    }

    public DefaultConversionService getConversionService() {
        return this.conversionService;
    }
}
```

#### DefaultConversionService

Spring框架中的核心类，主要用于处理类型转换。

- 默认转换器：通过addDefaultConverters方法注册了一系列默认的转换器，包括标量类型转换器、集合类型转换器等
- 类型转换：提供了多种内置类型转换器，如String到Inter，List到Array等
- 扩展性：允许开发者通过ConverterRegistry 接口添加自定义的转换器

```Java
public class DefaultConversionService extends GenericConversionService {
    @Nullable
    private static volatile DefaultConversionService sharedInstance;

    public DefaultConversionService() {
        addDefaultConverters(this);
    }

    public static ConversionService getSharedInstance() {
        DefaultConversionService cs = sharedInstance;
        if (cs == null) {
            Class var1 = DefaultConversionService.class;
            synchronized(DefaultConversionService.class) {
                cs = sharedInstance;
                if (cs == null) {
                    cs = new DefaultConversionService();
                    sharedInstance = cs;
                }
            }
        }

        return cs;
    }

    public static void addDefaultConverters(ConverterRegistry converterRegistry) {
        addScalarConverters(converterRegistry);
        addCollectionConverters(converterRegistry);
        converterRegistry.addConverter(new ByteBufferConverter((ConversionService)converterRegistry));
        converterRegistry.addConverter(new StringToTimeZoneConverter());
        converterRegistry.addConverter(new ZoneIdToTimeZoneConverter());
        converterRegistry.addConverter(new ZonedDateTimeToCalendarConverter());
        converterRegistry.addConverter(new ObjectToObjectConverter());
        converterRegistry.addConverter(new IdToEntityConverter((ConversionService)converterRegistry));
        converterRegistry.addConverter(new FallbackObjectToStringConverter());
        converterRegistry.addConverter(new ObjectToOptionalConverter((ConversionService)converterRegistry));
    }

    public static void addCollectionConverters(ConverterRegistry converterRegistry) {
        ConversionService conversionService = (ConversionService)converterRegistry;
        converterRegistry.addConverter(new ArrayToCollectionConverter(conversionService));
        converterRegistry.addConverter(new CollectionToArrayConverter(conversionService));
        converterRegistry.addConverter(new ArrayToArrayConverter(conversionService));
        converterRegistry.addConverter(new CollectionToCollectionConverter(conversionService));
        converterRegistry.addConverter(new MapToMapConverter(conversionService));
        converterRegistry.addConverter(new ArrayToStringConverter(conversionService));
        converterRegistry.addConverter(new StringToArrayConverter(conversionService));
        converterRegistry.addConverter(new ArrayToObjectConverter(conversionService));
        converterRegistry.addConverter(new ObjectToArrayConverter(conversionService));
        converterRegistry.addConverter(new CollectionToStringConverter(conversionService));
        converterRegistry.addConverter(new StringToCollectionConverter(conversionService));
        converterRegistry.addConverter(new CollectionToObjectConverter(conversionService));
        converterRegistry.addConverter(new ObjectToCollectionConverter(conversionService));
        converterRegistry.addConverter(new StreamConverter(conversionService));
    }

    private static void addScalarConverters(ConverterRegistry converterRegistry) {
        converterRegistry.addConverterFactory(new NumberToNumberConverterFactory());
        converterRegistry.addConverterFactory(new StringToNumberConverterFactory());
        converterRegistry.addConverter(Number.class, String.class, new ObjectToStringConverter());
        converterRegistry.addConverter(new StringToCharacterConverter());
        converterRegistry.addConverter(Character.class, String.class, new ObjectToStringConverter());
        converterRegistry.addConverter(new NumberToCharacterConverter());
        converterRegistry.addConverterFactory(new CharacterToNumberFactory());
        converterRegistry.addConverter(new StringToBooleanConverter());
        converterRegistry.addConverter(Boolean.class, String.class, new ObjectToStringConverter());
        converterRegistry.addConverterFactory(new StringToEnumConverterFactory());
        converterRegistry.addConverter(new EnumToStringConverter((ConversionService)converterRegistry));
        converterRegistry.addConverterFactory(new IntegerToEnumConverterFactory());
        converterRegistry.addConverter(new EnumToIntegerConverter((ConversionService)converterRegistry));
        converterRegistry.addConverter(new StringToLocaleConverter());
        converterRegistry.addConverter(Locale.class, String.class, new ObjectToStringConverter());
        converterRegistry.addConverter(new StringToCharsetConverter());
        converterRegistry.addConverter(Charset.class, String.class, new ObjectToStringConverter());
        converterRegistry.addConverter(new StringToCurrencyConverter());
        converterRegistry.addConverter(Currency.class, String.class, new ObjectToStringConverter());
        converterRegistry.addConverter(new StringToPropertiesConverter());
        converterRegistry.addConverter(new PropertiesToStringConverter());
        converterRegistry.addConverter(new StringToUUIDConverter());
        converterRegistry.addConverter(UUID.class, String.class, new ObjectToStringConverter());
        converterRegistry.addConverter(new StringToPatternConverter());
        converterRegistry.addConverter(Pattern.class, String.class, new ObjectToStringConverter());
        if (KotlinDetector.isKotlinPresent()) {
            converterRegistry.addConverter(new StringToRegexConverter());
            converterRegistry.addConverter(Regex.class, String.class, new ObjectToStringConverter());
        }

    }
}
```

#### GenericConversionService

Spring框架中常用于处理类型转换的核心服务类，提供了类型转换、查找和执行功能

- 类型转换管理：管理各种类型转换器（GenericConverter），并提供了类型转换能力
- 缓存机制：缓存已经查找过的转换器
- 支持条件转换：通过 ConditionalConverter 接口，支持根据条件判断是否可以进行类型转换

```Java
public class GenericConversionService implements ConfigurableConversionService {
    private static final GenericConverter NO_OP_CONVERTER = new NoOpConverter("NO_OP");
    private static final GenericConverter NO_MATCH = new NoOpConverter("NO_MATCH");
    private final Converters converters = new Converters();
    private final Map<ConverterCacheKey, GenericConverter> converterCache = new ConcurrentReferenceHashMap(64);

    public GenericConversionService() {
    }

    public void addConverter(Converter<?, ?> converter) {
        ResolvableType[] typeInfo = this.getRequiredTypeInfo(converter.getClass(), Converter.class);
        if (typeInfo == null && converter instanceof DecoratingProxy decoratingProxy) {
            typeInfo = this.getRequiredTypeInfo(decoratingProxy.getDecoratedClass(), Converter.class);
        }

        if (typeInfo == null) {
            throw new IllegalArgumentException("Unable to determine source type <S> and target type <T> for your Converter [" + converter.getClass().getName() + "]; does the class parameterize those types?");
        } else {
            this.addConverter((GenericConverter)(new ConverterAdapter(converter, typeInfo[0], typeInfo[1])));
        }
    }

    public <S, T> void addConverter(Class<S> sourceType, Class<T> targetType, Converter<? super S, ? extends T> converter) {
        this.addConverter((GenericConverter)(new ConverterAdapter(converter, ResolvableType.forClass(sourceType), ResolvableType.forClass(targetType))));
    }

    public void addConverter(GenericConverter converter) {
        this.converters.add(converter);
        this.invalidateCache();
    }

    public void addConverterFactory(ConverterFactory<?, ?> factory) {
        ResolvableType[] typeInfo = this.getRequiredTypeInfo(factory.getClass(), ConverterFactory.class);
        if (typeInfo == null && factory instanceof DecoratingProxy decoratingProxy) {
            typeInfo = this.getRequiredTypeInfo(decoratingProxy.getDecoratedClass(), ConverterFactory.class);
        }

        if (typeInfo == null) {
            throw new IllegalArgumentException("Unable to determine source type <S> and target type <T> for your ConverterFactory [" + factory.getClass().getName() + "]; does the class parameterize those types?");
        } else {
            this.addConverter((GenericConverter)(new ConverterFactoryAdapter(factory, new GenericConverter.ConvertiblePair(typeInfo[0].toClass(), typeInfo[1].toClass()))));
        }
    }

    public void removeConvertible(Class<?> sourceType, Class<?> targetType) {
        this.converters.remove(sourceType, targetType);
        this.invalidateCache();
    }

    public boolean canConvert(@Nullable Class<?> sourceType, Class<?> targetType) {
        Assert.notNull(targetType, "Target type to convert to cannot be null");
        return this.canConvert(sourceType != null ? TypeDescriptor.valueOf(sourceType) : null, TypeDescriptor.valueOf(targetType));
    }

    public boolean canConvert(@Nullable TypeDescriptor sourceType, TypeDescriptor targetType) {
        Assert.notNull(targetType, "Target type to convert to cannot be null");
        return sourceType == null || this.getConverter(sourceType, targetType) != null;
    }

    public boolean canBypassConvert(@Nullable TypeDescriptor sourceType, TypeDescriptor targetType) {
        Assert.notNull(targetType, "Target type to convert to cannot be null");
        return sourceType == null || this.getConverter(sourceType, targetType) == NO_OP_CONVERTER;
    }

    @Nullable
    public <T> T convert(@Nullable Object source, Class<T> targetType) {
        Assert.notNull(targetType, "Target type to convert to cannot be null");
        return this.convert(source, TypeDescriptor.forObject(source), TypeDescriptor.valueOf(targetType));
    }

    @Nullable
    public Object convert(@Nullable Object source, @Nullable TypeDescriptor sourceType, TypeDescriptor targetType) {
        Assert.notNull(targetType, "Target type to convert to cannot be null");
        if (sourceType == null) {
            Assert.isTrue(source == null, "Source must be [null] if source type == [null]");
            return this.handleResult((TypeDescriptor)null, targetType, this.convertNullSource((TypeDescriptor)null, targetType));
        } else if (source != null && !sourceType.getObjectType().isInstance(source)) {
            String var10002 = String.valueOf(sourceType);
            throw new IllegalArgumentException("Source to convert from must be an instance of [" + var10002 + "]; instead it was a [" + source.getClass().getName() + "]");
        } else {
            GenericConverter converter = this.getConverter(sourceType, targetType);
            if (converter != null) {
                Object result = ConversionUtils.invokeConverter(converter, source, sourceType, targetType);
                return this.handleResult(sourceType, targetType, result);
            } else {
                return this.handleConverterNotFound(source, sourceType, targetType);
            }
        }
    }

    public String toString() {
        return this.converters.toString();
    }

    @Nullable
    protected Object convertNullSource(@Nullable TypeDescriptor sourceType, TypeDescriptor targetType) {
        return targetType.getObjectType() == Optional.class ? Optional.empty() : null;
    }

    @Nullable
    protected GenericConverter getConverter(TypeDescriptor sourceType, TypeDescriptor targetType) {
        ConverterCacheKey key = new ConverterCacheKey(sourceType, targetType);
        GenericConverter converter = (GenericConverter)this.converterCache.get(key);
        if (converter != null) {
            return converter != NO_MATCH ? converter : null;
        } else {
            converter = this.converters.find(sourceType, targetType);
            if (converter == null) {
                converter = this.getDefaultConverter(sourceType, targetType);
            }

            if (converter != null) {
                this.converterCache.put(key, converter);
                return converter;
            } else {
                this.converterCache.put(key, NO_MATCH);
                return null;
            }
        }
    }

    @Nullable
    protected GenericConverter getDefaultConverter(TypeDescriptor sourceType, TypeDescriptor targetType) {
        return sourceType.isAssignableTo(targetType) ? NO_OP_CONVERTER : null;
    }

    @Nullable
    private ResolvableType[] getRequiredTypeInfo(Class<?> converterClass, Class<?> genericIfc) {
        ResolvableType resolvableType = ResolvableType.forClass(converterClass).as(genericIfc);
        ResolvableType[] generics = resolvableType.getGenerics();
        if (generics.length < 2) {
            return null;
        } else {
            Class<?> sourceType = generics[0].resolve();
            Class<?> targetType = generics[1].resolve();
            return sourceType != null && targetType != null ? generics : null;
        }
    }

    private void invalidateCache() {
        this.converterCache.clear();
    }

    @Nullable
    private Object handleConverterNotFound(@Nullable Object source, @Nullable TypeDescriptor sourceType, TypeDescriptor targetType) {
        if (source == null) {
            this.assertNotPrimitiveTargetType(sourceType, targetType);
            return null;
        } else if ((sourceType == null || sourceType.isAssignableTo(targetType)) && targetType.getObjectType().isInstance(source)) {
            return source;
        } else {
            throw new ConverterNotFoundException(sourceType, targetType);
        }
    }

    @Nullable
    private Object handleResult(@Nullable TypeDescriptor sourceType, TypeDescriptor targetType, @Nullable Object result) {
        if (result == null) {
            this.assertNotPrimitiveTargetType(sourceType, targetType);
        }

        return result;
    }

    private void assertNotPrimitiveTargetType(@Nullable TypeDescriptor sourceType, TypeDescriptor targetType) {
        if (targetType.isPrimitive()) {
            throw new ConversionFailedException(sourceType, targetType, (Object)null, new IllegalArgumentException("A null value cannot be assigned to a primitive type"));
        }
    }

    private static class Converters {
        private final Set<GenericConverter> globalConverters = new CopyOnWriteArraySet();
        private final Map<GenericConverter.ConvertiblePair, ConvertersForPair> converters = new ConcurrentHashMap(256);

        private Converters() {
        }

        public void add(GenericConverter converter) {
            Set<GenericConverter.ConvertiblePair> convertibleTypes = converter.getConvertibleTypes();
            if (convertibleTypes == null) {
                Assert.state(converter instanceof ConditionalConverter, "Only conditional converters may return null convertible types");
                this.globalConverters.add(converter);
            } else {
                Iterator var3 = convertibleTypes.iterator();

                while(var3.hasNext()) {
                    GenericConverter.ConvertiblePair convertiblePair = (GenericConverter.ConvertiblePair)var3.next();
                    this.getMatchableConverters(convertiblePair).add(converter);
                }
            }

        }

        private ConvertersForPair getMatchableConverters(GenericConverter.ConvertiblePair convertiblePair) {
            return (ConvertersForPair)this.converters.computeIfAbsent(convertiblePair, (k) -> {
                return new ConvertersForPair();
            });
        }

        public void remove(Class<?> sourceType, Class<?> targetType) {
            this.converters.remove(new GenericConverter.ConvertiblePair(sourceType, targetType));
        }

        @Nullable
        public GenericConverter find(TypeDescriptor sourceType, TypeDescriptor targetType) {
            List<Class<?>> sourceCandidates = this.getClassHierarchy(sourceType.getType());
            List<Class<?>> targetCandidates = this.getClassHierarchy(targetType.getType());
            Iterator var5 = sourceCandidates.iterator();

            while(var5.hasNext()) {
                Class<?> sourceCandidate = (Class)var5.next();
                Iterator var7 = targetCandidates.iterator();

                while(var7.hasNext()) {
                    Class<?> targetCandidate = (Class)var7.next();
                    GenericConverter.ConvertiblePair convertiblePair = new GenericConverter.ConvertiblePair(sourceCandidate, targetCandidate);
                    GenericConverter converter = this.getRegisteredConverter(sourceType, targetType, convertiblePair);
                    if (converter != null) {
                        return converter;
                    }
                }
            }

            return null;
        }

        @Nullable
        private GenericConverter getRegisteredConverter(TypeDescriptor sourceType, TypeDescriptor targetType, GenericConverter.ConvertiblePair convertiblePair) {
            ConvertersForPair convertersForPair = (ConvertersForPair)this.converters.get(convertiblePair);
            if (convertersForPair != null) {
                GenericConverter converter = convertersForPair.getConverter(sourceType, targetType);
                if (converter != null) {
                    return converter;
                }
            }

            Iterator var7 = this.globalConverters.iterator();

            GenericConverter globalConverter;
            do {
                if (!var7.hasNext()) {
                    return null;
                }

                globalConverter = (GenericConverter)var7.next();
            } while(!((ConditionalConverter)globalConverter).matches(sourceType, targetType));

            return globalConverter;
        }

        private List<Class<?>> getClassHierarchy(Class<?> type) {
            List<Class<?>> hierarchy = new ArrayList(20);
            Set<Class<?>> visited = new HashSet(20);
            this.addToClassHierarchy(0, ClassUtils.resolvePrimitiveIfNecessary(type), false, hierarchy, visited);
            boolean array = type.isArray();

            for(int i = 0; i < hierarchy.size(); ++i) {
                Class<?> candidate = (Class)hierarchy.get(i);
                candidate = array ? candidate.componentType() : ClassUtils.resolvePrimitiveIfNecessary(candidate);
                Class<?> superclass = candidate.getSuperclass();
                if (superclass != null && superclass != Object.class && superclass != Enum.class) {
                    this.addToClassHierarchy(i + 1, candidate.getSuperclass(), array, hierarchy, visited);
                }

                this.addInterfacesToClassHierarchy(candidate, array, hierarchy, visited);
            }

            if (Enum.class.isAssignableFrom(type)) {
                this.addToClassHierarchy(hierarchy.size(), Enum.class, false, hierarchy, visited);
                this.addInterfacesToClassHierarchy(Enum.class, false, hierarchy, visited);
            }

            this.addToClassHierarchy(hierarchy.size(), Object.class, array, hierarchy, visited);
            this.addToClassHierarchy(hierarchy.size(), Object.class, false, hierarchy, visited);
            return hierarchy;
        }

        private void addInterfacesToClassHierarchy(Class<?> type, boolean asArray, List<Class<?>> hierarchy, Set<Class<?>> visited) {
            Class[] var5 = type.getInterfaces();
            int var6 = var5.length;

            for(int var7 = 0; var7 < var6; ++var7) {
                Class<?> implementedInterface = var5[var7];
                this.addToClassHierarchy(hierarchy.size(), implementedInterface, asArray, hierarchy, visited);
            }

        }

        private void addToClassHierarchy(int index, Class<?> type, boolean asArray, List<Class<?>> hierarchy, Set<Class<?>> visited) {
            if (asArray) {
                type = type.arrayType();
            }

            if (visited.add(type)) {
                hierarchy.add(index, type);
            }

        }

        public String toString() {
            StringBuilder builder = new StringBuilder();
            builder.append("ConversionService converters =\n");
            Iterator var2 = this.getConverterStrings().iterator();

            while(var2.hasNext()) {
                String converterString = (String)var2.next();
                builder.append('\t').append(converterString).append('\n');
            }

            return builder.toString();
        }

        private List<String> getConverterStrings() {
            List<String> converterStrings = new ArrayList();
            Iterator var2 = this.converters.values().iterator();

            while(var2.hasNext()) {
                ConvertersForPair convertersForPair = (ConvertersForPair)var2.next();
                converterStrings.add(convertersForPair.toString());
            }

            Collections.sort(converterStrings);
            return converterStrings;
        }
    }

    private final class ConverterAdapter implements ConditionalGenericConverter {
        private final Converter<Object, Object> converter;
        private final GenericConverter.ConvertiblePair typeInfo;
        private final ResolvableType targetType;

        public ConverterAdapter(Converter<?, ?> converter, ResolvableType sourceType, ResolvableType targetType) {
            this.converter = converter;
            this.typeInfo = new GenericConverter.ConvertiblePair(sourceType.toClass(), targetType.toClass());
            this.targetType = targetType;
        }

        public Set<GenericConverter.ConvertiblePair> getConvertibleTypes() {
            return Collections.singleton(this.typeInfo);
        }

        public boolean matches(TypeDescriptor sourceType, TypeDescriptor targetType) {
            if (this.typeInfo.getTargetType() != targetType.getObjectType()) {
                return false;
            } else {
                ResolvableType rt = targetType.getResolvableType();
                if (!(rt.getType() instanceof Class) && !rt.isAssignableFrom(this.targetType) && !this.targetType.hasUnresolvableGenerics()) {
                    return false;
                } else {
                    Converter var5 = this.converter;
                    boolean var10000;
                    if (var5 instanceof ConditionalConverter) {
                        ConditionalConverter conditionalConverter = (ConditionalConverter)var5;
                        if (!conditionalConverter.matches(sourceType, targetType)) {
                            var10000 = false;
                            return var10000;
                        }
                    }

                    var10000 = true;
                    return var10000;
                }
            }
        }

        @Nullable
        public Object convert(@Nullable Object source, TypeDescriptor sourceType, TypeDescriptor targetType) {
            return source == null ? GenericConversionService.this.convertNullSource(sourceType, targetType) : this.converter.convert(source);
        }

        public String toString() {
            String var10000 = String.valueOf(this.typeInfo);
            return var10000 + " : " + String.valueOf(this.converter);
        }
    }

    private final class ConverterFactoryAdapter implements ConditionalGenericConverter {
        private final ConverterFactory<Object, Object> converterFactory;
        private final GenericConverter.ConvertiblePair typeInfo;

        public ConverterFactoryAdapter(ConverterFactory<?, ?> converterFactory, GenericConverter.ConvertiblePair typeInfo) {
            this.converterFactory = converterFactory;
            this.typeInfo = typeInfo;
        }

        public Set<GenericConverter.ConvertiblePair> getConvertibleTypes() {
            return Collections.singleton(this.typeInfo);
        }

        public boolean matches(TypeDescriptor sourceType, TypeDescriptor targetType) {
            boolean matches = true;
            ConverterFactory var5 = this.converterFactory;
            if (var5 instanceof ConditionalConverter conditionalConverterx) {
                matches = conditionalConverterx.matches(sourceType, targetType);
            }

            if (matches) {
                Converter<?, ?> converter = this.converterFactory.getConverter(targetType.getType());
                if (converter instanceof ConditionalConverter) {
                    ConditionalConverter conditionalConverter = (ConditionalConverter)converter;
                    matches = conditionalConverter.matches(sourceType, targetType);
                }
            }

            return matches;
        }

        @Nullable
        public Object convert(@Nullable Object source, TypeDescriptor sourceType, TypeDescriptor targetType) {
            return source == null ? GenericConversionService.this.convertNullSource(sourceType, targetType) : this.converterFactory.getConverter(targetType.getObjectType()).convert(source);
        }

        public String toString() {
            String var10000 = String.valueOf(this.typeInfo);
            return var10000 + " : " + String.valueOf(this.converterFactory);
        }
    }

    private static final class ConverterCacheKey implements Comparable<ConverterCacheKey> {
        private final TypeDescriptor sourceType;
        private final TypeDescriptor targetType;

        public ConverterCacheKey(TypeDescriptor sourceType, TypeDescriptor targetType) {
            this.sourceType = sourceType;
            this.targetType = targetType;
        }

        public boolean equals(@Nullable Object other) {
            boolean var10000;
            if (this != other) {
                label28: {
                    if (other instanceof ConverterCacheKey) {
                        ConverterCacheKey that = (ConverterCacheKey)other;
                        if (this.sourceType.equals(that.sourceType) && this.targetType.equals(that.targetType)) {
                            break label28;
                        }
                    }

                    var10000 = false;
                    return var10000;
                }
            }

            var10000 = true;
            return var10000;
        }

        public int hashCode() {
            return this.sourceType.hashCode() * 29 + this.targetType.hashCode();
        }

        public String toString() {
            String var10000 = String.valueOf(this.sourceType);
            return "ConverterCacheKey [sourceType = " + var10000 + ", targetType = " + String.valueOf(this.targetType) + "]";
        }

        public int compareTo(ConverterCacheKey other) {
            int result = this.sourceType.getResolvableType().toString().compareTo(other.sourceType.getResolvableType().toString());
            if (result == 0) {
                result = this.targetType.getResolvableType().toString().compareTo(other.targetType.getResolvableType().toString());
            }

            return result;
        }
    }

    private static class NoOpConverter implements GenericConverter {
        private final String name;

        public NoOpConverter(String name) {
            this.name = name;
        }

        @Nullable
        public Set<GenericConverter.ConvertiblePair> getConvertibleTypes() {
            return null;
        }

        @Nullable
        public Object convert(@Nullable Object source, TypeDescriptor sourceType, TypeDescriptor targetType) {
            return source;
        }

        public String toString() {
            return this.name;
        }
    }

    private static class ConvertersForPair {
        private final Deque<GenericConverter> converters = new ConcurrentLinkedDeque();

        private ConvertersForPair() {
        }

        public void add(GenericConverter converter) {
            this.converters.addFirst(converter);
        }

        @Nullable
        public GenericConverter getConverter(TypeDescriptor var1, TypeDescriptor var2) {
            // $FF: Couldn't be decompiled
        }

        public String toString() {
            return StringUtils.collectionToCommaDelimitedString(this.converters);
        }
    }
}
```

#### ConfigurableConversionService

```Java
public interface ConfigurableConversionService extends ConversionService, ConverterRegistry {
}
```

#### ConversionService

Spring类型转换机制的核心接口，提供了灵活的类型转换能力。

- canConvert：判断是否可以将sourceType类型转换为targetType类型
- convert：将sourceType类型对象转换为targetType类型对象

```Java
public interface ConversionService {
    boolean canConvert(@Nullable Class<?> sourceType, Class<?> targetType);

    boolean canConvert(@Nullable TypeDescriptor sourceType, TypeDescriptor targetType);

    @Nullable
    <T> T convert(@Nullable Object source, Class<T> targetType);

    @Nullable
    default Object convert(@Nullable Object source, TypeDescriptor targetType) {
        return this.convert(source, TypeDescriptor.forObject(source), targetType);
    }

    @Nullable
    Object convert(@Nullable Object source, @Nullable TypeDescriptor sourceType, TypeDescriptor targetType);
}
```

#### ConverterRegistry

用于管理类型转换器的接口，提供了多种方法来注册和移除转换器。

- addConverter：添加一个转换器，用于从源类型到目标类型的转换
- addConverterFactory：工厂类，创建特定类型的转换器
- removeConvertible：移除注册表中与指定源类型和目标类型匹配的转换器

```Java
public interface ConverterRegistry {
    void addConverter(Converter<?, ?> converter);

    <S, T> void addConverter(Class<S> sourceType, Class<T> targetType, Converter<? super S, ? extends T> converter);

    void addConverter(GenericConverter converter);

    void addConverterFactory(ConverterFactory<?, ?> factory);

    void removeConvertible(Class<?> sourceType, Class<?> targetType);
}
```

### MapOutputConverter

Map转换器

1. getFormat：输送给大模型的List格式说明
2. convert：将模型输出的实例字符串转`List<String>`

```Java
public class MapOutputConverter extends AbstractMessageOutputConverter<Map<String, Object>> {
    public MapOutputConverter() {
        super(new MappingJackson2MessageConverter());
    }

    public Map<String, Object> convert(@NonNull String text) {
        if (text.startsWith("```json") && text.endsWith("```")) {
            text = text.substring(7, text.length() - 3);
        }
        // 将字符串text转换为UTF-8编码的字节数组，确保文本数据能以字节刘的形式传输
        // 构建Message对象，并将字节数组作为消息的负载
        Message<?> message = MessageBuilder.withPayload(text.getBytes(StandardCharsets.UTF_8)).build();
        return (Map)this.getMessageConverter().fromMessage(message, HashMap.class);
    }

    public String getFormat() {
        String raw = "Your response should be in JSON format.\nThe data structure for the JSON should match this Java class: %s\nDo not include any explanations, only provide a RFC8259 compliant JSON response following this format without deviation.\nRemove the ```json markdown surrounding the output including the trailing \"```\".\n";
        return String.format(raw, HashMap.class.getName());
    }
}
```

#### AbstractMessageOutputConverter

```Java
public abstract class AbstractMessageOutputConverter<T> implements StructuredOutputConverter<T> {
    private MessageConverter messageConverter;

    public AbstractMessageOutputConverter(MessageConverter messageConverter) {
        this.messageConverter = messageConverter;
    }

    public MessageConverter getMessageConverter() {
        return this.messageConverter;
    }
}
```

#### MessageConverter

消息转换接口，用于将消息内容（payload）与目标类型之间进行转换

- fromMessage：将Message对象转换为目标类型的对象
- toMessag：将给定对象转换为Message对象

```Java
public interface MessageConverter {
    @Nullable
    Object fromMessage(Message<?> message, Class<?> targetClass);

    @Nullable
    Message<?> toMessage(Object payload, @Nullable MessageHeaders headers);
}
```

#### SmartMessageConverter

```Java
public interface SmartMessageConverter extends MessageConverter {
    @Nullable
    Object fromMessage(Message<?> message, Class<?> targetClass, @Nullable Object conversionHint);

    @Nullable
    Message<?> toMessage(Object payload, @Nullable MessageHeaders headers, @Nullable Object conversionHint);
}
```

#### MappingJackson2MessageConverter

Spring框架中的消息转换器，主要用于实现JSON格式的序列化和反序列化

- JSON序列化与反序列化：基于 Jackson 库的 ObjectMapper 来实现 JSON 的序列化和反序列化
- 支持多种MIME类型：默认支持 application/json 和 application/*+jso
- convertFromInternal：将消息的payload从JSON格式反序列化为目标Java对象
- convertToInternal：将 Java 对象序列化为 JSON 格式，并将其作为消息的 payload

```Java
public class MappingJackson2MessageConverter extends AbstractMessageConverter {
    private static final MimeType[] DEFAULT_MIME_TYPES = new MimeType[]{new MimeType("application", "json"), new MimeType("application", "*+json")};
    private ObjectMapper objectMapper;
    @Nullable
    private Boolean prettyPrint;

    public MappingJackson2MessageConverter() {
        this(DEFAULT_MIME_TYPES);
    }

    public MappingJackson2MessageConverter(MimeType... supportedMimeTypes) {
        super(supportedMimeTypes);
        this.objectMapper = new ObjectMapper();
        this.objectMapper.configure(MapperFeature.DEFAULT_VIEW_INCLUSION, false);
        this.objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public MappingJackson2MessageConverter(ObjectMapper objectMapper) {
        this(objectMapper, DEFAULT_MIME_TYPES);
    }

    public MappingJackson2MessageConverter(ObjectMapper objectMapper, MimeType... supportedMimeTypes) {
        super(supportedMimeTypes);
        Assert.notNull(objectMapper, "ObjectMapper must not be null");
        this.objectMapper = objectMapper;
    }

    public void setObjectMapper(ObjectMapper objectMapper) {
        Assert.notNull(objectMapper, "ObjectMapper must not be null");
        this.objectMapper = objectMapper;
        this.configurePrettyPrint();
    }

    public ObjectMapper getObjectMapper() {
        return this.objectMapper;
    }

    public void setPrettyPrint(boolean prettyPrint) {
        this.prettyPrint = prettyPrint;
        this.configurePrettyPrint();
    }

    private void configurePrettyPrint() {
        if (this.prettyPrint != null) {
            this.objectMapper.configure(SerializationFeature.INDENT_OUTPUT, this.prettyPrint);
        }

    }

    protected boolean canConvertFrom(Message<?> message, @Nullable Class<?> targetClass) {
        if (targetClass != null && this.supportsMimeType(message.getHeaders())) {
            JavaType javaType = this.objectMapper.constructType(targetClass);
            AtomicReference<Throwable> causeRef = new AtomicReference();
            if (this.objectMapper.canDeserialize(javaType, causeRef)) {
                return true;
            } else {
                this.logWarningIfNecessary(javaType, (Throwable)causeRef.get());
                return false;
            }
        } else {
            return false;
        }
    }

    protected boolean canConvertTo(Object payload, @Nullable MessageHeaders headers) {
        if (!this.supportsMimeType(headers)) {
            return false;
        } else {
            AtomicReference<Throwable> causeRef = new AtomicReference();
            if (this.objectMapper.canSerialize(payload.getClass(), causeRef)) {
                return true;
            } else {
                this.logWarningIfNecessary(payload.getClass(), (Throwable)causeRef.get());
                return false;
            }
        }
    }

    protected void logWarningIfNecessary(Type type, @Nullable Throwable cause) {
        if (cause != null) {
            boolean debugLevel = cause instanceof JsonMappingException && cause.getMessage() != null && cause.getMessage().startsWith("Cannot find");
            if (debugLevel) {
                if (!this.logger.isDebugEnabled()) {
                    return;
                }
            } else if (!this.logger.isWarnEnabled()) {
                return;
            }

            String msg = "Failed to evaluate Jackson " + (type instanceof JavaType ? "de" : "") + "serialization for type [" + String.valueOf(type) + "]";
            if (debugLevel) {
                this.logger.debug(msg, cause);
            } else if (this.logger.isDebugEnabled()) {
                this.logger.warn(msg, cause);
            } else {
                this.logger.warn(msg + ": " + String.valueOf(cause));
            }

        }
    }

    protected boolean supports(Class<?> clazz) {
        throw new UnsupportedOperationException();
    }

    @Nullable
    protected Object convertFromInternal(Message<?> message, Class<?> targetClass, @Nullable Object conversionHint) {
        JavaType javaType = this.objectMapper.constructType(getResolvedType(targetClass, conversionHint));
        Object payload = message.getPayload();
        Class<?> view = this.getSerializationView(conversionHint);

        try {
            if (ClassUtils.isAssignableValue(targetClass, payload)) {
                return payload;
            } else if (payload instanceof byte[]) {
                byte[] bytes = (byte[])payload;
                return view != null ? this.objectMapper.readerWithView(view).forType(javaType).readValue(bytes) : this.objectMapper.readValue(bytes, javaType);
            } else {
                return view != null ? this.objectMapper.readerWithView(view).forType(javaType).readValue(payload.toString()) : this.objectMapper.readValue(payload.toString(), javaType);
            }
        } catch (IOException var8) {
            throw new MessageConversionException(message, "Could not read JSON: " + var8.getMessage(), var8);
        }
    }

    @Nullable
    protected Object convertToInternal(Object payload, @Nullable MessageHeaders headers, @Nullable Object conversionHint) {
        try {
            Class<?> view = this.getSerializationView(conversionHint);
            if (byte[].class == this.getSerializedPayloadClass()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream(1024);
                JsonEncoding encoding = this.getJsonEncoding(this.getMimeType(headers));
                JsonGenerator generator = this.objectMapper.getFactory().createGenerator(out, encoding);

                try {
                    if (view != null) {
                        this.objectMapper.writerWithView(view).writeValue(generator, payload);
                    } else {
                        this.objectMapper.writeValue(generator, payload);
                    }

                    payload = out.toByteArray();
                } catch (Throwable var11) {
                    if (generator != null) {
                        try {
                            generator.close();
                        } catch (Throwable var10) {
                            var11.addSuppressed(var10);
                        }
                    }

                    throw var11;
                }

                if (generator != null) {
                    generator.close();
                }
            } else {
                Writer writer = new StringWriter(1024);
                if (view != null) {
                    this.objectMapper.writerWithView(view).writeValue(writer, payload);
                } else {
                    this.objectMapper.writeValue(writer, payload);
                }

                payload = writer.toString();
            }

            return payload;
        } catch (IOException var12) {
            throw new MessageConversionException("Could not write JSON: " + var12.getMessage(), var12);
        }
    }

    @Nullable
    protected Class<?> getSerializationView(@Nullable Object conversionHint) {
        if (conversionHint instanceof MethodParameter param) {
            JsonView annotation = param.getParameterIndex() >= 0 ? (JsonView)param.getParameterAnnotation(JsonView.class) : (JsonView)param.getMethodAnnotation(JsonView.class);
            if (annotation != null) {
                return this.extractViewClass(annotation, conversionHint);
            }
        } else {
            if (conversionHint instanceof JsonView jsonView) {
                return this.extractViewClass(jsonView, conversionHint);
            }

            if (conversionHint instanceof Class<?> clazz) {
                return clazz;
            }
        }

        return null;
    }

    private Class<?> extractViewClass(JsonView annotation, Object conversionHint) {
        Class<?>[] classes = annotation.value();
        if (classes.length != 1) {
            throw new IllegalArgumentException("@JsonView only supported for handler methods with exactly 1 class argument: " + String.valueOf(conversionHint));
        } else {
            return classes[0];
        }
    }

    protected JsonEncoding getJsonEncoding(@Nullable MimeType contentType) {
        if (contentType != null && contentType.getCharset() != null) {
            Charset charset = contentType.getCharset();
            JsonEncoding[] var3 = JsonEncoding.values();
            int var4 = var3.length;

            for(int var5 = 0; var5 < var4; ++var5) {
                JsonEncoding encoding = var3[var5];
                if (charset.name().equals(encoding.getJavaName())) {
                    return encoding;
                }
            }
        }

        return JsonEncoding.UTF8;
    }
}
```

#### AbstractMessageConverter

Spring框架中消息转换的抽象基类，主要用于消息的序列化和反序列化。具体的转换逻辑由子类实现

```Java
public abstract class AbstractMessageConverter implements SmartMessageConverter {
    protected final Log logger;
    private final List<MimeType> supportedMimeTypes;
    @Nullable
    private ContentTypeResolver contentTypeResolver;
    private boolean strictContentTypeMatch;
    private Class<?> serializedPayloadClass;

    protected AbstractMessageConverter(MimeType supportedMimeType) {
        this((Collection)Collections.singletonList(supportedMimeType));
    }

    protected AbstractMessageConverter(MimeType... supportedMimeTypes) {
        this((Collection)Arrays.asList(supportedMimeTypes));
    }

    protected AbstractMessageConverter(Collection<MimeType> supportedMimeTypes) {
        this.logger = LogFactory.getLog(this.getClass());
        this.supportedMimeTypes = new ArrayList(4);
        this.contentTypeResolver = new DefaultContentTypeResolver();
        this.strictContentTypeMatch = false;
        this.serializedPayloadClass = byte[].class;
        this.supportedMimeTypes.addAll(supportedMimeTypes);
    }

    public List<MimeType> getSupportedMimeTypes() {
        return Collections.unmodifiableList(this.supportedMimeTypes);
    }

    protected void addSupportedMimeTypes(MimeType... supportedMimeTypes) {
        this.supportedMimeTypes.addAll(Arrays.asList(supportedMimeTypes));
    }

    public void setContentTypeResolver(@Nullable ContentTypeResolver resolver) {
        this.contentTypeResolver = resolver;
    }

    @Nullable
    public ContentTypeResolver getContentTypeResolver() {
        return this.contentTypeResolver;
    }

    public void setStrictContentTypeMatch(boolean strictContentTypeMatch) {
        if (strictContentTypeMatch) {
            Assert.notEmpty(this.getSupportedMimeTypes(), "Strict match requires non-empty list of supported mime types");
            Assert.notNull(this.getContentTypeResolver(), "Strict match requires ContentTypeResolver");
        }

        this.strictContentTypeMatch = strictContentTypeMatch;
    }

    public boolean isStrictContentTypeMatch() {
        return this.strictContentTypeMatch;
    }

    public void setSerializedPayloadClass(Class<?> payloadClass) {
        Assert.isTrue(byte[].class == payloadClass || String.class == payloadClass, () -> {
            return "Payload class must be byte[] or String: " + String.valueOf(payloadClass);
        });
        this.serializedPayloadClass = payloadClass;
    }

    public Class<?> getSerializedPayloadClass() {
        return this.serializedPayloadClass;
    }

    @Nullable
    public final Object fromMessage(Message<?> message, Class<?> targetClass) {
        return this.fromMessage(message, targetClass, (Object)null);
    }

    @Nullable
    public final Object fromMessage(Message<?> message, Class<?> targetClass, @Nullable Object conversionHint) {
        return !this.canConvertFrom(message, targetClass) ? null : this.convertFromInternal(message, targetClass, conversionHint);
    }

    @Nullable
    public final Message<?> toMessage(Object payload, @Nullable MessageHeaders headers) {
        return this.toMessage(payload, headers, (Object)null);
    }

    @Nullable
    public final Message<?> toMessage(Object payload, @Nullable MessageHeaders headers, @Nullable Object conversionHint) {
        if (!this.canConvertTo(payload, headers)) {
            return null;
        } else {
            Object payloadToUse = this.convertToInternal(payload, headers, conversionHint);
            if (payloadToUse == null) {
                return null;
            } else {
                MimeType mimeType = this.getDefaultContentType(payloadToUse);
                if (headers != null) {
                    MessageHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(headers, MessageHeaderAccessor.class);
                    if (accessor != null && accessor.isMutable()) {
                        if (mimeType != null) {
                            accessor.setHeaderIfAbsent("contentType", mimeType);
                        }

                        return MessageBuilder.createMessage(payloadToUse, accessor.getMessageHeaders());
                    }
                }

                MessageBuilder<?> builder = MessageBuilder.withPayload(payloadToUse);
                if (headers != null) {
                    builder.copyHeaders(headers);
                }

                if (mimeType != null) {
                    builder.setHeaderIfAbsent("contentType", mimeType);
                }

                return builder.build();
            }
        }
    }

    protected boolean canConvertFrom(Message<?> message, Class<?> targetClass) {
        return this.supports(targetClass) && this.supportsMimeType(message.getHeaders());
    }

    protected boolean canConvertTo(Object payload, @Nullable MessageHeaders headers) {
        return this.supports(payload.getClass()) && this.supportsMimeType(headers);
    }

    protected boolean supportsMimeType(@Nullable MessageHeaders headers) {
        if (this.getSupportedMimeTypes().isEmpty()) {
            return true;
        } else {
            MimeType mimeType = this.getMimeType(headers);
            if (mimeType == null) {
                return !this.isStrictContentTypeMatch();
            } else {
                Iterator var3 = this.getSupportedMimeTypes().iterator();

                MimeType current;
                do {
                    if (!var3.hasNext()) {
                        return false;
                    }

                    current = (MimeType)var3.next();
                } while(!current.getType().equals(mimeType.getType()) || !current.getSubtype().equals(mimeType.getSubtype()));

                return true;
            }
        }
    }

    @Nullable
    protected MimeType getMimeType(@Nullable MessageHeaders headers) {
        return this.contentTypeResolver != null ? this.contentTypeResolver.resolve(headers) : null;
    }

    @Nullable
    protected MimeType getDefaultContentType(Object payload) {
        List<MimeType> mimeTypes = this.getSupportedMimeTypes();
        return !mimeTypes.isEmpty() ? (MimeType)mimeTypes.get(0) : null;
    }

    protected abstract boolean supports(Class<?> clazz);

    @Nullable
    protected Object convertFromInternal(Message<?> message, Class<?> targetClass, @Nullable Object conversionHint) {
        return null;
    }

    @Nullable
    protected Object convertToInternal(Object payload, @Nullable MessageHeaders headers, @Nullable Object conversionHint) {
        return null;
    }

    static Type getResolvedType(Class<?> targetClass, @Nullable Object conversionHint) {
        if (conversionHint instanceof MethodParameter param) {
            param = param.nestedIfOptional();
            if (Message.class.isAssignableFrom(param.getParameterType())) {
                param = param.nested();
            }

            Type genericParameterType = param.getNestedGenericParameterType();
            Class<?> contextClass = param.getContainingClass();
            return GenericTypeResolver.resolveType(genericParameterType, contextClass);
        } else {
            return targetClass;
        }
    }
}
```

## 实战

### AI模型内置JSON

#### JsonController

```Java
import com.alibaba.cloud.ai.dashscope.api.DashScopeResponseFormat;
import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatOptions;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/json")
public class JsonController {

    private final ChatClient chatClient;
    private final DashScopeResponseFormat responseFormat;

    public JsonController(ChatClient.Builder builder) {
        // AI模型内置支持JSON模式
        DashScopeResponseFormat responseFormat = new DashScopeResponseFormat();
        responseFormat.setType(DashScopeResponseFormat.Type.JSON_OBJECT);

        this.responseFormat = responseFormat;
        this.chatClient = builder
                .build();
    }

    @GetMapping("/chat")
    public String simpleChat(@RequestParam(value = "query", defaultValue = "请以JSON格式介绍你自己") String query) {
        return chatClient.prompt(query).call().content();
    }

    @GetMapping("/chat-format")
    public String simpleChatFormat(@RequestParam(value = "query", defaultValue = "请以JSON格式介绍你自己") String query) {
        return chatClient.prompt(query)
                .options(
                        DashScopeChatOptions.builder()
                                .withTopP(0.7)
                                .withResponseFormat(responseFormat)
                                .build()
                )
                .call().content();
    }
}
```

#### 效果

无内置，可以看到返回上面有标json

![](/img/blog/spring-ai-output-structure/json_none.png)

有内置，返回最纯粹的JSON格式

![](/img/blog/spring-ai-output-structure/json_inter.png)

### Bean转换

#### BeanEntity

这里利用@JsonPropertyOrder指定反序列化时各属性的顺序

```Java
@JsonPropertyOrder({"title", "date", "author", "content"}) // 指定属性的顺序
public class BeanEntity {

    private String title;
    private String author;
    private String date;
    private String content;

    public BeanEntity() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    @Override
    public String toString() {
        return "StreamToBeanEntity{" +
                "title='" + title + '\'' +
                ", author='" + author + '\'' +
                ", date='" + date + '\'' +
                ", content='" + content + '\'' +
                '}';
    }
}
```

#### BeanController

```Java
import com.yingzi.structedOutput.entity.BeanEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/bean")
public class BeanController {

    private static final Logger log = LoggerFactory.getLogger(BeanController.class);

    private final ChatClient chatClient;
    private final ChatModel chatModel;
    private final BeanOutputConverter<BeanEntity> converter;
    private final String format;

    public BeanController(ChatClient.Builder builder, ChatModel chatModel) {
        this.chatModel = chatModel;

        this.converter = new BeanOutputConverter<>(
                new ParameterizedTypeReference<BeanEntity>() {
                }
        );
        this.format = converter.getFormat();
        log.info("format: {}", format);
        this.chatClient = builder
                .build();
    }

    @GetMapping("/chat")
    public String simpleChat(@RequestParam(value = "query", defaultValue = "以影子为作者，写一篇200字左右的有关人工智能诗篇") String query) {
        String result = chatClient.prompt(query)
                .call().content();

        log.info("result: {}", result);
        assert result != null;
        try {
            BeanEntity convert = converter.convert(result);
            log.info("反序列成功，convert: {}", convert);
        } catch (Exception e) {
            log.error("反序列化失败");
        }
        return result;
    }

    @GetMapping("/chat-format")
    public String simpleChatFormat(@RequestParam(value = "query", defaultValue = "以影子为作者，写一篇200字左右的有关人工智能诗篇") String query) {
        String promptUserSpec = """
                format: 以纯文本输出 json，请不要包含任何多余的文字——包括 markdown 格式;
                outputExample: {format};
                """;
        String result = chatClient.prompt(query)
                .user(u -> u.text(promptUserSpec)
                        .param("format", format))
                .call().content();

        log.info("result: {}", result);
        assert result != null;
        try {
            BeanEntity convert = converter.convert(result);
            log.info("反序列成功，convert: {}", convert);
        } catch (Exception e) {
            log.error("反序列化失败");
        }
        return result;
    }

    @GetMapping("/chat-model-format")
    public String chatModel(@RequestParam(value = "query", defaultValue = "以影子为作者，写一篇200字左右的有关人工智能诗篇") String query) {
        String template = query + "{format}";
        Prompt prompt = new PromptTemplate(template, Map.of("format", format)).create();

        String result = chatModel.call(prompt).getResult().getOutput().getText();
        log.info("result: {}", result);
        assert result != null;
        try {
            BeanEntity convert = converter.convert(result);
            log.info("反序列成功，convert: {}", convert);
        } catch (Exception e) {
            log.error("反序列化失败");
        }
        return result;
    }
}
```

#### 效果

没有格式规定，反序列失败

![](/img/blog/spring-ai-output-structure/serialize_no_format.png)

ChatClient反序列化成功

![](/img/blog/spring-ai-output-structure/serialize_client_format.png)

ChatModel反序列化成功

![](/img/blog/spring-ai-output-structure/serialize_model_format.png)

### Map及List转换

#### MapListController

```Java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.converter.ListOutputConverter;
import org.springframework.ai.converter.MapOutputConverter;
import org.springframework.core.convert.support.DefaultConversionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/map")
public class MapListController {

    private static final Logger log = LoggerFactory.getLogger(BeanController.class);

    private final ChatClient chatClient;
    private final MapOutputConverter mapConverter;
    private final ListOutputConverter listConverter;

    public MapListController(ChatClient.Builder builder) {
        // map转换器
        this.mapConverter = new MapOutputConverter();
        // list转换器
        this.listConverter = new ListOutputConverter(new DefaultConversionService());

        this.chatClient = builder
                .build();
    }

    @GetMapping("/chatMap")
    public Map<String, Object> chatMap(@RequestParam(value = "query", defaultValue = "请为我描述下影子的特性") String query) {
        String promptUserSpec = """
                format: key为描述的东西，value为对应的值
                outputExample: {format};
                """;
        String format = mapConverter.getFormat();
        log.info("map format: {}",format);

        String result = chatClient.prompt(query)
                .user(u -> u.text(promptUserSpec)
                        .param("format", format))
                .call().content();
        log.info("result: {}", result);
        assert result != null;
        Map<String, Object> convert = null;
        try {
            convert = mapConverter.convert(result);
            log.info("反序列成功，convert: {}", convert);
        } catch (Exception e) {
            log.error("反序列化失败");
        }
        return convert;
    }

    @GetMapping("/chatList")
    public List<String> chatList(@RequestParam(value = "query", defaultValue = "请为我描述下影子的特性") String query) {
        String promptUserSpec = """
                format: value为对应的值
                outputExample: {format};
                """;
        String format = listConverter.getFormat();
        log.info("list format: {}",format);

        String result = chatClient.prompt(query)
                .user(u -> u.text(promptUserSpec)
                        .param("format", format))
                .call().content();
        log.info("result: {}", result);
        assert result != null;
        List<String> convert = null;
        try {
            convert = listConverter.convert(result);
            log.info("反序列成功，convert: {}", convert);
        } catch (Exception e) {
            log.error("反序列化失败");
        }
        return convert;
    }
}
```

#### 效果

map转换

![](/img/blog/spring-ai-output-structure/map_convert.png)

list转换

![](/img/blog/spring-ai-output-structure/list_convert.png)

## 参考资料

https://docs.spring.io/spring-ai/reference/api/structured-output-converter.html
