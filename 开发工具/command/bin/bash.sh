#!/bin/bash
export NODE_ENV='dev' # 设置环境变量

# bash中的变量可以包含数字，字符，字符串等
str="hello world"

echo $str
echo $0 # 文件名称
echo $1 # 第一个参数
echo $# # 参数个数
echo $* # 所有参数

exit 0

# bash创建数组方式
array[0] = val
array[1] = val
array[2] = val
array=([2]=val [0]=val [1]=val)
array(val val val)

# 如果varname存在且不为null，则返回其值; 否则返回word
${varname:-word}    

# 如果varname存在且不为null，则返回其值;否则设置它，然后返回其值
${varname:=word}    

# 如果varname存在并且不为null，返回word; 否则返回null 
${varname:+word}    

# 执行子字符串扩展。它返回$ varname的子字符串，从offset开始，最多为length的字符
${varname:offset:length}  


# 函数的使用

function hello {
   echo world!
}
# 执行 hello ，返回 world;

function say {
    echo $1
}

# 执行 say "hello world!",返回  "hello world!"


# 条件语句 与分支语句

