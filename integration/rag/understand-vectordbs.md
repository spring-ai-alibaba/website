# Understanding Vectors {#understand-vector-databases}

![vector_2d_coordinates.png](vector_2d_coordinates.png)

向量具有维度和方向。
例如，下图描绘了笛卡尔坐标系中的二维向量 \\(\vec{a}\\)，表示为箭头。

向量 \\(\vec{a}\\) 的头部位于点 \\((a_1, a_2)\\)。
*x* 坐标值是 \\(a_1\\)，*y* 坐标值是 \\(a_2\\)。坐标也称为向量的分量。

## Similarity {#vectordbs-similarity}

可以使用几种数学公式来确定两个向量是否相似。
最直观和易于理解的是余弦相似度。
考虑以下显示三组图形的图像：

![vector_similarity.png](vector_similarity.png)

当向量 \\(\vec{A}\\) 和 \\(\vec{B}\\) 指向彼此接近时，它们被认为是相似的，如第一个图所示。
当向量彼此垂直指向时，它们被认为是无关的，当它们彼此远离指向时，它们被认为是相反的。

它们之间的角度 \\(\theta\\) 是它们相似性的良好度量。
如何计算角度 \\(\theta\\)？

![pythagorean-triangle.png](pythagorean-triangle.png)

我们都熟悉[勾股定理](https://en.wikipedia.org/wiki/Pythagorean_theorem#History)。

当 *a* 和 *b* 之间的角度不是 90 度时怎么办？

请参阅[余弦定律](https://en.wikipedia.org/wiki/Law_of_cosines)。

**余弦定律**

\\(a^2 + b^2 - 2ab\cos\theta = c^2\\)

下图显示了作为向量图的这种方法：
![lawofcosines.png](lawofcosines.png)

该向量的大小根据其分量定义为：

**大小**

\\(\vec{A} * \vec{A} = ||\vec{A}||^2 = A_1^2 + A_2^2\\)

两个向量 \\(\vec{A}\\) 和 \\(\vec{B}\\) 之间的点积根据其分量定义为：

**点积**

\\(\vec{A} * \vec{B} = A_1B_1 + A_2B_2\\)

用向量大小和点积重写余弦定律，得到以下结果：

**向量形式的余弦定律**

\\(||\vec{A}||^2 + ||\vec{B}||^2 - 2||\vec{A}||||\vec{B}||\cos\theta = ||\vec{C}||^2\\)

将 \\(||\vec{C}||^2\\) 替换为 \\(||\vec{B} - \vec{A}||^2\\)，得到以下结果：

**仅用 \\(\vec{A}\\) 和 \\(\vec{B}\\) 表示的向量形式的余弦定律**

\\(||\vec{A}||^2 + ||\vec{B}||^2 - 2||\vec{A}||||\vec{B}||\cos\theta = ||\vec{B} - \vec{A}||^2\\)

[展开这个](https://towardsdatascience.com/cosine-similarity-how-does-it-measure-the-similarity-maths-behind-and-usage-in-python-50ad30aad7db) 得到[余弦相似度](https://en.wikipedia.org/wiki/Cosine_similarity)的公式。

**余弦相似度**

\\(similarity(\vec{A},\vec{B}) = \cos(\theta) = \frac{\vec{A}\cdot\vec{B}}{||\vec{A}||\cdot||\vec{B}||}\\)

这个公式适用于高于 2 或 3 的维度，尽管很难可视化。但是，[可以在某种程度上可视化](https://projector.tensorflow.org/)。
在 AI/ML 应用中，向量通常具有数百甚至数千个维度。

下面显示了使用向量分量的高维相似度函数。
它通过使用[求和数学语法](https://en.wikipedia.org/wiki/Summation)将之前给出的二维大小和点积定义扩展到 *N* 维。

**使用向量分量的余弦相似度**

\\(similarity(\vec{A},\vec{B}) = \cos(\theta) = \frac{ \sum_{i=1}^{n} {A_i  B_i} }{ \sqrt{\sum_{i=1}^{n}{A_i^2} \cdot \sum_{i=1}^{n}{B_i^2}}}\\)

这是在向量存储的简单实现中使用的关键公式，可以在 `SimpleVectorStore` 实现中找到。

