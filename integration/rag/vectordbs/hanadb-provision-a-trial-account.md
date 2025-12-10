# Provision SAP HANA Cloud trial account

以下是使用试用账户配置 SAP Hana Database 的步骤

让我们首先创建一个[临时邮箱](https://temp-mail.org/en/)用于注册

![hanadb/0.png](hanadb/0.png)

> **提示：** 不要关闭上面的窗口，否则会生成新的邮箱 ID。

访问 [sap.com](https://sap.com/) 并导航到 `products` -> `Trials and Demos`

![hanadb/1.png](hanadb/1.png)

点击 `Advanced Trials`

![hanadb/2.png](hanadb/2.png)

点击 `SAP BTP Trial`

![hanadb/3.png](hanadb/3.png)

点击 `Start your free 90-day trial`

![hanadb/4.png](hanadb/4.png)

粘贴我们在第一步中创建的 `temporary email id`，然后点击 `Next`

![hanadb/5.png](hanadb/5.png)

我们填写详细信息并点击 `Submit`

![hanadb/6.png](hanadb/6.png)

是时候检查我们临时邮箱账户的收件箱了

![hanadb/7.png](hanadb/7.png)

注意到我们的临时邮箱账户收到了一封邮件

![hanadb/8.png](hanadb/8.png)

打开邮件并 `click to activate` 试用账户

![hanadb/9.png](hanadb/9.png)

它将提示创建 `password`。提供密码并点击 `Submit`

![hanadb/10.png](hanadb/10.png)

试用账户现已创建。点击 `start the trial`

![hanadb/11.png](hanadb/11.png)

提供您的电话号码并点击 `Continue`

![hanadb/13.png](hanadb/13.png)

我们在电话号码上收到 OTP。提供 `code` 并点击 `continue`

![hanadb/14.png](hanadb/14.png)

选择 `region` 为 `US East (VA) - AWS`

![hanadb/15.png](hanadb/15.png)

点击 `Continue`

![hanadb/16.png](hanadb/16.png)

`SAP BTP trial` 账户已准备就绪。点击 `Go to your Trial account`

![hanadb/17.png](hanadb/17.png)

点击 `Trial` 子账户

![hanadb/18.png](hanadb/18.png)

打开 `Instances and Subscriptions`

![hanadb/19.png](hanadb/19.png)

是时候创建订阅了。点击 `Create` 按钮

![hanadb/20.1.png](hanadb/20.1.png)

创建订阅时，选择 `service` 为 `SAP Hana Cloud`，`Plan` 为 `tools`，然后点击 `Create`

![hanadb/20.2.png](hanadb/20.2.png)

注意到 `SAP Hana Cloud` 订阅现已创建。点击左侧面板上的 `Users`

![hanadb/21.png](hanadb/21.png)

选择用户名（我们之前提供的临时邮箱）并点击 `Assign Role Collection`

![hanadb/22.png](hanadb/22.png)

搜索 `hana` 并选择显示的所有 3 个角色集合。点击 `Assign Role Collection`

![hanadb/23.png](hanadb/23.png)

我们的 `user` 现在拥有所有 3 个角色集合。点击 `Instances and Subscriptions`

![hanadb/24.png](hanadb/24.png)

现在，点击订阅下的 `SAP Hana Cloud` 应用程序

![hanadb/25.png](hanadb/25.png)

还没有实例。让我们点击 `Create Instance`

![hanadb/26.png](hanadb/26.png)

选择 Type 为 `SAP HANA Cloud, SAP HANA Database`。点击 `Next Step`

![hanadb/27.png](hanadb/27.png)

提供 `Instance Name`、`Description`、DBADMIN 管理员的 `password`。
选择最新版本 `2024.2 (QRC 1/2024)`。点击 `Next Step`

![hanadb/28.png](hanadb/28.png)

保持所有内容为默认值。点击 `Next Step`

![hanadb/29.png](hanadb/29.png)

点击 `Next Step`

![hanadb/30.png](hanadb/30.png)

选择 `Allow all IP addresses` 并点击 `Next Step`

![hanadb/31.png](hanadb/31.png)

点击 `Review and Create`

![hanadb/32.png](hanadb/32.png)

点击 `Create Instance`

![hanadb/33.png](hanadb/33.png)

注意到 `SAP Hana Database` 实例的配置已开始。配置需要一些时间 - 请耐心等待。

![hanadb/34.1.png](hanadb/34.1.png)

一旦实例配置完成（状态显示为 `Running`），我们可以通过点击实例并选择 `Connections` 来获取数据源 URL（`SQL Endpoint`）

![hanadb/34.2.png](hanadb/34.2.png)

我们通过点击 `...` 导航到 `SAP Hana Database Explorer`

![hanadb/35.png](hanadb/35.png)

提供管理员凭据并点击 `OK`

![hanadb/36.png](hanadb/36.png)

打开 SQL 控制台并使用以下 DDL 语句创建表 `CRICKET_WORLD_CUP`：

```sql
CREATE TABLE CRICKET_WORLD_CUP (
    _ID VARCHAR2(255) PRIMARY KEY,
    CONTENT CLOB,
    EMBEDDING REAL_VECTOR(1536)
)
```

![hanadb/37.png](hanadb/37.png)

导航到 `hana_dev_db -> Catalog -> Tables` 以找到我们的表 `CRICKET_WORLD_CUP`

![hanadb/38.png](hanadb/38.png)

右键单击表并点击 `Open Data`

![hanadb/39.png](hanadb/39.png)

注意到现在显示了表数据。由于我们还没有创建任何嵌入，所以没有行。

![hanadb/40.png](hanadb/40.png)

下一步：[SAP Hana Vector Engine](api/vectordbs/hana)

