###tcp学习总结

参考[阿里中间件团队博客](http://jm.taobao.org/2017/06/08/20170608/)

看过太多tcp相关文章，但是看完总是不过瘾，似懂非懂，反复考虑过后，我觉得是那些文章太过理论，看起来没有体感，所以吸收不了。 希望这篇文章能做到言简意赅，帮助大家透过案例来理解原理。

####tcp的特点

这个大家基本都能说几句，面试的时候候选人也肯定会告诉你这些：

- 三次握手
- 四次挥手
- 可靠连接
- 丢包重传
但是我只希望大家记住一个核心的：**tcp是可以可靠传输协议，它的所有特点都为这个可靠传输服务**。

####那么tcp是怎么样来保障可靠传输呢？

tcp在传输过程中都有一个**ack**，接收方通过**ack**告诉发送方收到那些包了。这样发送方能知道有没有丢包，进而确定重传。

####tcp建连接的三次握手

来看一个java代码连接数据库的三次握手过程
![Alt text](./6d66dadecb72e11e3e5ab765c6c3ea2e.png)


三个红框表示建立连接的三次握手：

第一步：client 发送 syn 到server 发起握手；
第二步：server 收到 syn后回复syn+ack给client；
第三步：client 收到syn+ack后，回复server一个ack表示收到了server的syn+ack（此时client的48287端口的连接已经是established）


 握手的核心目的是告知对方seq（绿框是client的初始seq，蓝色框是server 的初始seq），对方回复ack（收到的seq+包的大小），这样发送端就知道有没有丢包了。

握手的次要目的是告知和协商一些信息，图中黄框。

- MSS–最大传输包
- SACK_PERM–是否支持Selective ack(用户优化重传效率）
- WS–窗口计算指数（有点复杂的话先不用管）

**这就是tcp为什么要握手建立连接，就是为了解决tcp的可靠传输。**

####tcp断开连接的四次挥手

再来看java连上mysql后，执行了一个SQL： select sleep(2); 然后就断开了连接

![Alt text](./b6f4a952cdf8ffbb8f6e9434d1432e05.png)



四个红框表示断开连接的四次挥手：

第一步： client主动发送fin包给server
第二步： server回复ack（对应第一步fin包的ack）给client，表示server知道client要断开了
第三步： server发送fin包给client，表示server也可以断开了
第四步： client回复ack给server，表示既然双发都发送fin包表示断开，那么就真的断开吧

####为什么握手三次、挥手四次

这个问题太恶心，面试官太喜欢问，其实他也许只能背诵：因为……。

我也不知道怎么回答。网上都说tcp是双向的，所以断开要四次。但是我认为建连接也是双向的（双向都协调告知对方自己的seq号），为什么不需要四次握手呢，所以网上说的不一定精准。

你再看三次握手的第二步发 syn+ack，如果拆分成两步先发ack再发syn完全也是可以的（效率略低），这样三次握手也变成四次握手了。

看起来挥手的时候多一次，主要是收到第一个fin包后单独回复了一个ack包，如果能回复fin+ack那么四次挥手也就变成三次了。 来看一个案例：

![Alt text](./1498807398351.png)

图中第二个红框就是回复的fin+ack，这样四次挥手变成三次了（如果一个包就是一次的话）。

>我的理解：之所以绝大数时候我们看到的都是四次挥手，是因为收到fin后，知道对方要关闭了，然后OS通知应用层要关闭啥的，这里应用层可能需要做些准备工作，有一些延时，所以先回ack，准备好了再发fin 。 握手过程没有这个准备过程所以可以立即发送syn+ack。

####ack=seq+len

**ack总是seq+len（包的大小）**，这样发送方明确知道server收到那些东西了。

但是特例是三次握手和四次挥手，虽然len都是0，但是syn和fin都要占用一个seq号，所以这里的ack都是seq+1。

![Alt text](./1498807484920.png)


看图中左边红框里的len+seq就是接收方回复的ack的数字，表示这个包接收方收到了。然后下一个包的seq就是前一个包的len+seq，依次增加，一旦中间发出去的东西没有收到ack就是丢包了，过一段时间（或者其他方式）触发重传，保障了tcp传输的可靠性。

####三次握手中协商的其它信息

**MSS** 最大一个包中能传输的信息（不含tcp、ip包头），MSS+包头就是MTU（最大传输单元），如果MTU过大可能在传输的过程中被卡住过不去造成卡死（这个大小的包一直传输不过去），跟丢包还不一样。

SACK_PERM 用于丢包的话提升重传效率，比如client一次发了1、2、3、4、5 这5个包给server，实际server收到了 1、3、4、5这四个包，中间2丢掉了。这个时候server回复ack的时候，都只能回复2，表示2前面所有的包都收到了，给我发第二个包吧，如果server 收到3、4、5还是没有收到2的话，也是回复ack 2而不是回复ack 3、4、5、6的，表示快点发2过来。

但是这个时候client虽然知道2丢了，然后会重发2，但是不知道3、4、5有没有丢啊，实际3、4、5 server都收到了，如果支持sack，那么可以ack 2的时候同时告诉client 3、4、5都收到了，这样client重传的时候只重传2就可以，如果没有sack的话那么可能会重传2、3、4、5，这样效率就低了。

来看一个例子：

![Alt text](./1498807523322.png)

图中的红框就是SACK。

> 知识点：ack数字表示这个数字前面的数据都收到了。

####总结

**tcp所有特性基本上核心都是为了可靠传输这个目标来服务的，然后有一些是出于优化性能的目的。**

