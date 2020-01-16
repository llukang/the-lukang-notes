### 本地执行 远端服务 命令

```bash
# ssh-copy-id命令可以把本地主机的公钥复制到远程主机的authorized_keys文件上，ssh-copy-id命令也会给远程主机的用户主目录（home）和~/.ssh, 和~/.ssh/authorized_keys设置合适的权限。
 ssh-copy-id [-i [identity_file]] [user@]machine # -i：指定公钥文件
 ssh-copy-id root@10.0.0.151

# 本地运行远端命令
scp dist.zip root@10.0.0.151:/opt/codo/codo/

ssh root@10.0.0.151 'cd /opt/codo/codo && unzip -o dist.zip'

```
