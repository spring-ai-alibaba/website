---
title: Dynamic Prompt Best Practices
keywords:  [Spring AI Alibaba, Nacos, Dynamic Prompt]
description: "Spring AI Alibaba Dynamic Prompt Best Practices"
---

Spring AI Alibaba uses the configuration center capabilities of Nacos to dynamically manage prompts for AI applications. This enables the functionality of dynamically updating prompts.

## Environment Preparation

Nacos: A Nacos instance with configuration center capabilities. This example uses Nacos 2.3.0. The latest version of Nacos 3.X is also suitable.

## AI Project Creation

Example project address: https://github.com/springaialibaba/spring-ai-alibaba-nacos-prompt-example

### Pom.xml

> Tips: The project has already imported Spring AI Alibaba Bom and Spring Boot Bom. Therefore, version numbers are omitted here. For BOM definitions, refer to the GitHub repository address above.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
</dependency>

<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-nacos-prompt</artifactId>
</dependency>
```

### Application.yml

Add the DataID monitored by Nacos and information such as username and password for the Nacos server in the configuration file.

```yml
server:
  port: 10010

spring:
  application:
    name: spring-ai-alibaba-nacos-prompt-example

  # Specify the prompt configuration to monitor
  config:
    import:
      - "optional:nacos:prompt-config.json"
  nacos:
    username: nacos
    password: nacos

  ai:
    # Enable Nacos prompt template listening functionality
    nacos:
      prompt:
        template:
          enabled: true

```

### Controller

```java
@RestController
@RequestMapping("/nacos")
public class PromptController {

    private static final Logger logger = org.slf4j.LoggerFactory.getLogger(PromptController.class);

    private final ChatClient client;

    private final ConfigurablePromptTemplateFactory promptTemplateFactory;

    public PromptController(
            ChatModel chatModel,
            ConfigurablePromptTemplateFactory promptTemplateFactory
    ) {

        this.client = ChatClient.builder(chatModel).build();
        this.promptTemplateFactory = promptTemplateFactory;
    }

    @GetMapping("/books")
    public Flux<String> generateJoke(
            @RequestParam(value = "author", required = false, defaultValue = "Lu Xun") String authorName
    ) {

        // Use Nacos prompt template to create prompt
        ConfigurablePromptTemplate template = promptTemplateFactory.create(
                "author",
                "please list the three most famous books by this {author}."
        );
        Prompt prompt = template.create(Map.of("author", authorName));
        logger.info("Final constructed prompt: {}", prompt.getContents());

        return client.prompt(prompt)
                .stream()
                .content();
    }

}
```

## Adding Nacos Configuration

1. Start the Nacos service;
2. Write configuration with dataId: spring.ai.alibaba.configurable.prompt
3. Write the following configuration:

    ```json
    [
      {
        "name": "author",
        "template": "List {author}'s famous works",
        "model": {
          "key": "Yu Hua"
        }
      }
    ]
    ```

## Functionality Demonstration

After completing the above configuration, start the project:

1. In the startup logs, you can see the following output indicating that it's monitoring this DataID configuration:

   ```shell
   OnPromptTemplateConfigChange,templateName:author,template:List {author}'s famous works, only the book name list,model:{key=Yu Hua}
   ```

2. Send a request to check the output:

   > Tips: Lu Xun's works are output here because the controller has set the defaultValue to "Lu Xun".

   ```java
   GET http://127.0.0.1:10010/nacos/books
   
   1. 《Call to Arms》 (《呐喊》)  
   2. 《Wandering》 (《彷徨》)  
   3. 《Dawn Blossoms Plucked at Dusk》 (《朝花夕拾》)  
   4. 《The True Story of Ah Q》 (《阿Q正传》)  
   5. 《Wild Grass》 (《野草》)  
   6. 《Tomb》 (《坟》)  
   7. 《Hot Wind》 (《热风》)  
   8. 《Huagai Collection》 (《华盖集》)  
   9. 《Huagai Collection Sequel》 (《华盖集续编》)  
   10. 《Old Tales Retold》 (《故事新编》)  
   11. 《Three Leisures Collection》 (《三闲集》)  
   12. 《Two Hearts Collection》 (《二心集》)  
   13. 《Southern and Northern Tunes Collection》 (《南腔北调集》)  
   14. 《Pseudo-Freedom Book》 (《伪自由书》)  
   15. 《Semi-Wind and Moon Talk》 (《准风月谈》)  
   16. 《Fringe Literature》 (《花边文学》)  
   17. 《Qie Jie Pavilion Essays》 (《且介亭杂文》)  
   18. 《Qie Jie Pavilion Essays Volume 2》 (《且介亭杂文二集》)  
   19. 《Qie Jie Pavilion Essays Final Volume》 (《且介亭杂文末编》)
   ```

   Check the console output:

   ```shell
   List Lu Xun's famous works, only the book name list
   ```

3. Dynamically update the Nacos Prompt configuration and check the effect of the request again

   > Tips: Since the controller has set the defaultValue to Lu Xun, the Prompt change still relates to literary writers.

   Change the Prompt to:

   ```json
   [
     {
       "name":"author",
       "template":"Introduce {author} and list their life experiences and literary achievements",
       "model":{
         "key":"Yu Hua"
       }
     }
   ]
   ```

   After **clicking publish**, you'll see the following console output, confirming the successful change:

   ```text
   OnPromptTemplateConfigChange,templateName:author,template:Introduce {author} and list their life experiences and literary achievements,model:{key=Yu Hua
   ```

4. Send the request again:

   ```shell
   GET http://127.0.0.1:10010/nacos/books
   
   Lu Xun (September 25, 1881 - October 19, 1936), born as Zhou Shuren, courtesy name Yuecai, from Shaoxing, Zhejiang, was one of the most important writers in modern Chinese literary history, as well as a thinker, revolutionary, and educator. With his sharp pen and profound social criticism, he became a standard-bearer and founder of the New Culture Movement in China.
   
   ---
   
   ### **Life Experiences**
   
   1. **Early Life and Education**  
      - Born in 1881 in a scholarly family in Shaoxing, Zhejiang; his father Zhou Boyi was a xiucai (a person who passed the imperial examination at the county level).
      - Experienced a transition from wealth to poverty in his youth due to family circumstances, which profoundly influenced his later thought development.
      - In 1898, he entered the Nanjing Naval Academy, later transferring to the Mining and Railway Department of the Jiangnan Military Academy.
   
   2. **Study in Japan**  
      - Went to Japan to study in 1902, first studying Japanese at Tokyo Hongwen Academy, then entering Sendai Medical School (now the Medical Department of Tohoku University) to study medicine.
      - During his time in Japan, he gradually realized that "healing minds" was more important than "healing bodies," and decided to abandon medicine for literature to awaken the national spirit.
   
   3. **Return to China and Teaching Career**  
      - After returning to China in 1909, he taught at institutions including Peking University and Beijing Normal University.
      - While engaged in literary creation, he actively participated in the New Culture Movement, promoting vernacular Chinese and new literature.
   
   4. **Creative Peak**  
      - Published his first vernacular short story "A Madman's Diary" in 1918, marking the beginning of modern Chinese fiction.
      - Afterward, Lu Xun's creative work entered its peak period, publishing numerous essays, novels, prose, and other works.
   
   5. **Later Life**  
      - Settled in Shanghai after 1927, continuing to write and participate in left-wing cultural activities.
      - Died of tuberculosis in Shanghai in 1936 at the age of 55.
   
   ---
   
   ### **Literary Achievements**
   
   Lu Xun's works cover fiction, prose, essays, poetry, and other genres, with extremely high artistic value and social significance.
   
   #### 1. **Fiction**
      - Lu Xun's fiction is known for profoundly revealing social problems and human weaknesses.
      - Representative works:
        - "Call to Arms": Including "A Madman's Diary," "The True Story of Ah Q," "Hometown," exposing the oppression of feudal systems on people.
        - "Wandering": Including "The New Year's Sacrifice," "In the Wine Shop," describing intellectuals' confusion and struggle.
      - Honored as the "Father of Modern Chinese Fiction."
   
   #### 2. **Prose**
      - His prose collection "Dawn Blossoms Plucked at Dusk" records his childhood and adolescent memories, with beautiful language and sincere emotions.
      - Representative works: "From Baicao Garden to Sanwei Study," "Mr. Fujino."
   
   #### 3. **Essays**
      - Lu Xun's essays, with their sharp critique of social reality, are known as "daggers and spears."
      - Essay collections: "Hot Wind," "Huagai Collection," "Tomb," "Qie Jie Pavilion Essays," etc.
      - Mainly targeting feudal ethics, warlord rule, cultural conservatism, etc.
   
   #### 4. **Translation and Research**
      - Lu Xun also translated many foreign literary works, such as Gogol's "Dead Souls."
      - He was dedicated to the organization and research of ancient Chinese culture, publishing academic works like "A Brief History of Chinese Fiction" and "Outline of Han Literature History."
   
   ---
   
   ### **Historical Position and Influence**
   
   1. **Contribution to Chinese Literature**  
      - Lu Xun pioneered a new era of modern Chinese literature, his works establishing the foundation of modern Chinese literature.
      - He advocated for vernacular Chinese, promoting the modernization of literary language.
   
   2. **Influence on Social Thought**  
      - Lu Xun's thought profoundly influenced generations of Chinese people, especially in opposing feudal ethics and advocating for thought liberation.
      - His essays became models for criticizing social injustice and exposing darkness.
   
   3. **International Reputation**  
      - Lu Xun's works have been translated into multiple languages and enjoy high prestige worldwide.
      - He is honored as "China's conscience" and "soul of the nation."
   
   Lu Xun's life was both a reflection on traditional culture and an exploration of modern society. His works continue to have powerful vitality and practical significance today.
   ```

   The final constructed prompt is:

   ```text
   Introduce Lu Xun and list their life experiences and literary achievements
   ```
