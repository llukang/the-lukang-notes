### 常用原则

单一职责原则、里氏替换原则、依赖倒置原则、接口隔
离原则、合成复用原则、最少知识原则


#### 单一职责原则（SRP）

 一个对象（方法）只做一件事情
 
 **要明确的是，并不是所有的职责都应该一一分离**
 
>jQuery 的 attr 是个非常庞大的方法，既负责赋值，又负责取值，这对于jQuery 的维护者来说，会带来一些困难，但对于 jQuery 的用户来说，却简化了用户的使用

>SRP 原则缺点，最明显的是会增加编写代码的复杂度。当我们按照职责把对象分解成更小的粒度之后，实际上也增大了这些对象之间相互联系的难度

#### 最少知识原则（LKP）

最少知识原则（LKP）说的是一个软件实体应当尽可能少地与其他实体发生相互作用。减少对象之间的联系。

#### 开放-封闭原则（OCP）

1. 挑选出最容易发生变化的地方，然后构造抽象来封闭这些变化
2. 在不可避免发生修改的时候，尽量修改那些相对容易修改的地方。拿一个开源库来说，修改它提供的配置文件，总比修改它的源代码来得简单。 
