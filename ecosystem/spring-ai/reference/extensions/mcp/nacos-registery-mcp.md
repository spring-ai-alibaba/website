# MCP 的注册

### 背景

Nacos 的友链：[Nacos 3.0 正式发布：MCP Registry、安全零信任、链接更多生态](https://nacos.io/blog/nacos-gvr7dxawbbpbgg16sv97bgirkixe/?spm=5238cd80.2ef5001f.0.0.3f613b7cBlKF0b&source=blog#%E5%AD%98%E9%87%8F-mcp-server%E6%B3%A8%E5%86%8C%E8%87%AA%E5%8A%A8%E6%B3%A8%E5%86%8C%E6%9C%8D%E5%8A%A1%E5%8A%A8%E6%80%81%E7%AE%A1%E7%90%86)

如果你的场景需要新构建 MCP Server，那么你可以注册到 Nacos MCP Registry，不仅可以统一进行发现 MCP 服务，还可以帮助你构建的 MCP Server 具备动态调整治理的能力；

针对新建的 MCP 服务，Nacos 提供多语言支持与自动化注册能力，过程中无代码侵入，或者是更换注解，无需写代码集成 Nacos 就可以自动注册，并且还有主要的特点：

- **跨语言生态适配：** 支持 Java（Spring AI）、Python、TypeScript（进行中）等主流框架，通过标准 SDK 或配置声明快速接入。
- **管理配置自动生效：** 服务注册后，可以通过 Nacos 产品化管理 MCP 元数据，如更新 MCP 描述、Tools 工具列表，更新信息后对应 MCP Server 会自动生效更改。
- **统一管理 MCP 发现：** 可以通过放在 Nacos 统一管理，可以通过网关或者 Nacos-Mcp-Router 进行统一的配置发现；

能动态管理 MCP 信息、工具描述和列表等，而无需进行繁琐的系统重启或运维。这样不仅降低了系统维护的复杂性，还大大提高了调试的效率和便捷性。

注册一个 stream-http 的示例代码：[https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-nacos-example/server/mcp-nacos-register-extensions-example](https://github.com/spring-ai-alibaba/examples/tree/main/spring-ai-alibaba-mcp-example/spring-ai-alibaba-mcp-nacos-example/server/mcp-nacos-register-extensions-example)

### pom 依赖

```xml
<dependencies>

    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-mcp-server-webflux</artifactId>
        <version>${spring-ai.version}</version>
    </dependency>

    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter-mcp-registry</artifactId>
        <version>${spring-ai-extensions.version}</version>
    </dependency>

</dependencies>
```

### application.yml 文件

```yaml
server:
  port: 21000

spring:
  main:
    banner-mode: off
  application:
    name: mcp-nacos-register-extensions-example
  ai:
    mcp:
      server:
        name: webflux-mcp-server
        version: 1.0.0
        type: ASYNC  # Recommended for reactive applications
        instructions: "This reactive server provides time information tools and resources"
        protocol: STREAMABLE
        request-timeout: 20s
        streamable-http:
          mcp-endpoint: /mcp
          keep-alive-interval: 30s
          disallow-delete: false

    alibaba:
      mcp:
        nacos:
          namespace: 0908ca08-c382-404c-9d96-37fe1628b183
          server-addr: 127.0.0.1:8848
          username: nacos
          password: nacos
          register:
            enabled: true
            service-group: mcp-server       ## 指定分组名称
            service-name: webflux-mcp-server ## 指定服务名称
```

### 启动及工具类

```java
@SpringBootApplication
public class RegistryServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(RegistryServerApplication.class, args);
    }

    @Bean
    public ToolCallbackProvider tools(OpenMeteoService openMeteoService) {
        return MethodToolCallbackProvider.builder().toolObjects(openMeteoService).build();
    }
}

@Service
public class OpenMeteoService {

    private static final Logger logger = LoggerFactory.getLogger(OpenMeteoService.class);

    // OpenMeteo免费天气API基础URL
    private static final String BASEURL = "https://api.open-meteo.com/v1";

    private final RestClient restClient;

    public OpenMeteoService() {
        this.restClient = RestClient.builder()
                .baseUrl(BASEURL)
                .defaultHeader("Accept", "application/json")
                .defaultHeader("User-Agent", "OpenMeteoClient/1.0")
                .build();
    }

    // OpenMeteo天气数据模型
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WeatherData(
            @JsonProperty("latitude") Double latitude,
            @JsonProperty("longitude") Double longitude,
            @JsonProperty("timezone") String timezone,
            @JsonProperty("current") CurrentWeather current,
            @JsonProperty("daily") DailyForecast daily,
            @JsonProperty("currentunits") CurrentUnits currentUnits) {

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record CurrentWeather(
                @JsonProperty("time") String time,
                @JsonProperty("temperature2m") Double temperature,
                @JsonProperty("apparenttemperature") Double feelsLike,
                @JsonProperty("relativehumidity2m") Integer humidity,
                @JsonProperty("precipitation") Double precipitation,
                @JsonProperty("weathercode") Integer weatherCode,
                @JsonProperty("windspeed10m") Double windSpeed,
                @JsonProperty("winddirection10m") Integer windDirection) {

        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record CurrentUnits(
                @JsonProperty("time") String timeUnit,
                @JsonProperty("temperature2m") String temperatureUnit,
                @JsonProperty("relativehumidity2m") String humidityUnit,
                @JsonProperty("windspeed10m") String windSpeedUnit) {

        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record DailyForecast(
                @JsonProperty("time") List<String> time,
                @JsonProperty("temperature2mmax") List<Double> tempMax,
                @JsonProperty("temperature2mmin") List<Double> tempMin,
                @JsonProperty("precipitationsum") List<Double> precipitationSum,
                @JsonProperty("weathercode") List<Integer> weatherCode,
                @JsonProperty("windspeed10mmax") List<Double> windSpeedMax,
                @JsonProperty("winddirection10mdominant") List<Integer> windDirection) {

        }
    }

    /**
     * 获取天气代码对应的描述
     */
    private String getWeatherDescription(int code) {
        return switch (code) {
            case 0 -> "晴朗";
            case 1, 2, 3 -> "多云";
            case 45, 48 -> "雾";
            case 51, 53, 55 -> "毛毛雨";
            case 56, 57 -> "冻雨";
            case 61, 63, 65 -> "雨";
            case 66, 67 -> "冻雨";
            case 71, 73, 75 -> "雪";
            case 77 -> "雪粒";
            case 80, 81, 82 -> "阵雨";
            case 85, 86 -> "阵雪";
            case 95 -> "雷暴";
            case 96, 99 -> "雷暴伴有冰雹";
            default -> "未知天气";
        };
    }

    /**
     * 获取风向描述
     */
    private String getWindDirection(int degrees) {
        if (degrees >= 337.5 || degrees < 22.5) {
            return "北风";
        }
        if (degrees >= 22.5 && degrees < 67.5) {
            return "东北风";
        }
        if (degrees >= 67.5 && degrees < 112.5) {
            return "东风";
        }
        if (degrees >= 112.5 && degrees < 157.5) {
            return "东南风";
        }
        if (degrees >= 157.5 && degrees < 202.5) {
            return "南风";
        }
        if (degrees >= 202.5 && degrees < 247.5) {
            return "西南风";
        }
        if (degrees >= 247.5 && degrees < 292.5) {
            return "西风";
        }
        return "西北风";
    }

    /**
     * 获取指定经纬度的天气预报
     *
     * @param latitude  纬度
     * @param longitude 经度
     *
     * @return 指定位置的天气预报
     *
     * @throws RestClientException 如果请求失败
     */
    @Tool(description = "获取指定经纬度的天气预报")
    public String getWeatherForecastByLocation(double latitude, double longitude) {
        logger.info("Getting weather forecast for location (latitude: {}, longitude: {})", latitude, longitude);

        // 获取天气数据（当前和未来7天）
        var weatherData = restClient.get()
                .uri("/forecast?latitude={latitude}&longitude={longitude}&current=temperature2m,apparenttemperature,relativehumidity2m,precipitation,weathercode,windspeed10m,winddirection10m&daily=temperature2mmax,temperature2mmin,precipitationsum,weathercode,windspeed10mmax,winddirection10mdominant&timezone=auto&forecastdays=7",
                        latitude, longitude)
                .retrieve()
                .body(WeatherData.class);

        // 拼接天气信息
        StringBuilder weatherInfo = new StringBuilder();

        // 添加当前天气信息
        WeatherData.CurrentWeather current = weatherData.current();
        String temperatureUnit = weatherData.currentUnits() != null ? weatherData.currentUnits().temperatureUnit()
                : "°C";
        String windSpeedUnit = weatherData.currentUnits() != null ? weatherData.currentUnits().windSpeedUnit() : "km/h";
        String humidityUnit = weatherData.currentUnits() != null ? weatherData.currentUnits().humidityUnit() : "%";

        weatherInfo.append(String.format("""
                        当前天气:
                        温度: %.1f%s (体感温度: %.1f%s)
                        天气: %s
                        风向: %s (%.1f %s)
                        湿度: %d%s
                        降水量: %.1f 毫米
                        
                        """,
                current.temperature(),
                temperatureUnit,
                current.feelsLike(),
                temperatureUnit,
                getWeatherDescription(current.weatherCode()),
                getWindDirection(current.windDirection()),
                current.windSpeed(),
                windSpeedUnit,
                current.humidity(),
                humidityUnit,
                current.precipitation()));

        // 添加未来天气预报
        weatherInfo.append("未来天气预报:\n");
        WeatherData.DailyForecast daily = weatherData.daily();

        for (int i = 0; i < daily.time().size(); i++) {
            String date = daily.time().get(i);
            double tempMin = daily.tempMin().get(i);
            double tempMax = daily.tempMax().get(i);
            int weatherCode = daily.weatherCode().get(i);
            double windSpeed = daily.windSpeedMax().get(i);
            int windDir = daily.windDirection().get(i);
            double precip = daily.precipitationSum().get(i);

            // 格式化日期
            LocalDate localDate = LocalDate.parse(date);
            String formattedDate = localDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd (EEE)"));

            weatherInfo.append(String.format("""
                            %s:
                            温度: %.1f%s ~ %.1f%s
                            天气: %s
                            风向: %s (%.1f %s)
                            降水量: %.1f 毫米
                            
                            """,
                    formattedDate,
                    tempMin, temperatureUnit,
                    tempMax, temperatureUnit,
                    getWeatherDescription(weatherCode),
                    getWindDirection(windDir),
                    windSpeed, windSpeedUnit,
                    precip));
        }

        return weatherInfo.toString();
    }

    /**
     * 获取指定位置的空气质量信息 (使用备用模拟数据)
     * 注意：由于OpenMeteo的空气质量API可能需要额外配置或不可用，这里提供备用数据
     *
     * @param latitude  纬度
     * @param longitude 经度
     *
     * @return 空气质量信息
     */
    @Tool(description = "获取指定位置的空气质量信息（模拟数据）")
    public String getAirQuality(@ToolParam(description = "纬度") double latitude,
                                @ToolParam(description = "经度") double longitude) {
        logger.info("Getting air quality for location (latitude: {}, longitude: {})", latitude, longitude);
        try {
            // 从天气数据中获取基本信息
            var weatherData = restClient.get()
                    .uri("/forecast?latitude={latitude}&longitude={longitude}&current=temperature2m&timezone=auto",
                            latitude, longitude)
                    .retrieve()
                    .body(WeatherData.class);

            // 模拟空气质量数据 - 实际情况下应该从真实API获取
            // 根据经纬度生成一些随机但相对合理的数据
            int europeanAqi = (int) (Math.random() * 100) + 1;
            int usAqi = (int) (europeanAqi * 1.5);
            double pm10 = Math.random() * 50 + 5;
            double pm25 = Math.random() * 25 + 2;
            double co = Math.random() * 500 + 100;
            double no2 = Math.random() * 40 + 5;
            double so2 = Math.random() * 20 + 1;
            double o3 = Math.random() * 80 + 20;

            String aqiLevel = getAqiLevel(europeanAqi);
            String usAqiLevel = getUsAqiLevel(usAqi);

            // 构建空气质量信息字符串
            String aqiInfo = String.format("""
                            空气质量信息 (纬度: %.4f, 经度: %.4f, 时区: %s):
                            
                            欧洲空气质量指数 (EAQI): %d (%s)
                            美国空气质量指数 (US AQI): %d (%s)
                            
                            详细污染物信息:
                            PM10: %.1f μg/m³
                            PM2.5: %.1f μg/m³
                            一氧化碳 (CO): %.1f μg/m³
                            二氧化氮 (NO2): %.1f μg/m³
                            二氧化硫 (SO2): %.1f μg/m³
                            臭氧 (O3): %.1f μg/m³
                            
                            注意：以上是模拟数据，仅供示例。
                            """,
                    latitude, longitude, weatherData.timezone(),
                    europeanAqi, aqiLevel,
                    usAqi, usAqiLevel,
                    pm10, pm25, co, no2, so2, o3);

            return aqiInfo;
        } catch (Exception e) {
            return "无法获取空气质量信息: " + e.getMessage();
        }
    }

    /**
     * 获取欧洲AQI等级描述
     */
    private String getAqiLevel(Integer aqi) {
        if (aqi <= 20) {
            return "优 (0-20): 空气质量非常好";
        } else if (aqi <= 40) {
            return "良 (20-40): 空气质量良好";
        } else if (aqi <= 60) {
            return "中等 (40-60): 对敏感人群可能有影响";
        } else if (aqi <= 80) {
            return "较差 (60-80): 对所有人群健康有影响";
        } else if (aqi <= 100) {
            return "差 (80-100): 可能对所有人群健康造成损害";
        } else {
            return "非常差 (>100): 对所有人群健康有严重影响";
        }
    }

    /**
     * 获取美国AQI等级描述
     */
    private String getUsAqiLevel(Integer aqi) {
        if (aqi <= 50) {
            return "优 (0-50): 空气质量令人满意，污染风险很低";
        } else if (aqi <= 100) {
            return "良 (51-100): 空气质量尚可，对极少数敏感人群可能有影响";
        } else if (aqi <= 150) {
            return "对敏感人群不健康 (101-150): 敏感人群可能会经历健康影响";
        } else if (aqi <= 200) {
            return "不健康 (151-200): 所有人可能开始经历健康影响";
        } else if (aqi <= 300) {
            return "非常不健康 (201-300): 健康警告，所有人可能经历更严重的健康影响";
        } else {
            return "危险 (>300): 健康警报，所有人更可能受到影响";
        }
    }

    public static void main(String[] args) {
        OpenMeteoService service = new OpenMeteoService();
        // 测试北京的天气预报
        System.out.println("北京天气预报:");
        System.out.println(service.getWeatherForecastByLocation(39.9042, 116.4074));

        // 测试北京的空气质量
        System.out.println("北京空气质量:");
        System.out.println(service.getAirQuality(39.9042, 116.4074));
    }
}
```

### 验证
![nacos-registry-1](/img/blog/extensions/mcp/nacos-registry-1.png)

点击详情后，可查看当前 MCP 服务提供的工具信息

![nacos-registry-2](/img/blog/extensions/mcp/nacos-registry-2.png)

在服务管理/服务列表处的 public-mcp 命名空间下，能看到当前节点实例信息

![nacos-registry-3](/img/blog/extensions/mcp/nacos-registry-3.png)

在配置管理/配置列表处的 public-mcp 命名空间下，能看到当前 mcp 服务对应的配置详情信息

![nacos-registry-4](/img/blog/extensions/mcp/nacos-registry-4.png)

4bd0fcb7-6e2e-4617-98a7-21b90f0bc69e-1.0.0-mcp-server.json 文件如下

![nacos-registry-5](/img/blog/extensions/mcp/nacos-registry-5.png)

4bd0fcb7-6e2e-4617-98a7-21b90f0bc69e-mcp-versions.json 文件如下

![nacos-registry-6](/img/blog/extensions/mcp/nacos-registry-6.png)

4bd0fcb7-6e2e-4617-98a7-21b90f0bc69e-1.0.0-mcp-tools.json 文件如下

![nacos-registry-7](/img/blog/extensions/mcp/nacos-registry-7.png)
