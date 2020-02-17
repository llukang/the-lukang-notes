## gitlab CI/CD 自动化

### 准备

1. gitlab 项目开启 CICD,添加 `.gitlab-ci.yml`文件
2. gitlab 添加 runner 用户 ，该账户需要拥有推送代码权限（可以在 group 上面添加用户）
3. 根据 项目实际情况修改 配置
4. 修改 `archive.js`，压缩到项目根目录 `dist.zip`
5. 注意 `.gitignore` 文件中 不能忽略 `*.zip`

### 模板文件

```yml
# 使用docker镜像， nodejs 12.6.0
image: 'node:12.6.0'

# 设置缓存
cache:
  key: ${CI_PROJECT_PATH}
  paths:
    - node_modules/
  policy: pull-push

# 配置阶段
stages:
  - build
  - deploy

# 任务名
build:
  stage: build
  tags:
    - public-runner001
  allow_failure: false
  script: # 定义脚本
    - rm -rf package-lock.json
    - npm config set registry http://verdaccio.xiaoduoai.com/
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist
  only:
    - dev1
    - test1

# deploy都继承这个
.deploy_base:
  stage: deploy
  variables:
    # 部署阶段不需要依赖git仓库，只需要依赖上一阶段传递的artifacts，也就是dist文件夹
    GIT_STRATEGY: none
  tags:
    - public-runner001
  cache: {}
  allow_failure: false

# dev 环境
deploy_to_dev/dev1:
  extends: .deploy_base
  environment:
    name: dev1
    url: https://wangcai-dev.xiaoduoai.com
  script:
    - scp -r ./dist root@39.98.188.23:/opt/web/wangcai/
    - echo "build success"
  only:
    - dev

# test 环境
deploy_to_test/test1:
  extends: .deploy_base
  environment:
    name: test1
    url: https://wangcai-test1.xiaoduoai.com
  script:
    - scp -r ./dist root@39.98.188.23:/opt/web/wangcai/
    - echo "build success"
  only:
    - test1
  when: manual

# prod
deploy_to_prod/prod:
  stage: deploy
  tags:
    - public-runner001
  allow_failure: false
  environment:
    name: prod
    url: https://wangcai.xiaoduoai.com
  before_script:
    - git config --global user.email "$GIT_RUNNER_ACCOUNT.gitlab@xiaoduotech.com"
    - git config --global user.name "$GIT_RUNNER_ACCOUNT"
    - npm config set registry http://verdaccio.xiaoduoai.com/
  script:
    - rm -rf package-lock.json
    - npm install
    - npm run deploy
    - npm run archive
    - git add .
    - git commit -m "$CI_COMMIT_REF_NAME"
    - git tag release/$CI_COMMIT_REF_NAME
    - git push https://$GIT_RUNNER_ACCOUNT:$GIT_RUNNER_PASSWORD@gitlab.xiaoduoai.com/$CI_PROJECT_PATH.git release/$CI_COMMIT_REF_NAME
  after_script:
    - scp -r ./dist/index.html root@10.200.0.32:/opt/web/wangcai-pre.xiaoduoai.com/dist
    - scp -r ./dist/index.html root@10.200.0.31:/opt/web/wangcai-pre.xiaoduoai.com/dist
    - scp -r ./dist/index.html root@10.200.0.30:/opt/web/wangcai-pre.xiaoduoai.com/dist
    - scp -r ./dist/index.html root@116.196.116.121:/opt/web/pre/dist
    - scp -r ./dist/index.html root@101.37.159.175:/opt/web/wangcai-pre/dist
  only:
    - /^v[0-9]+(?:.[0-9]+)+$/
```

### dev 环境

推送 dev 分支，自动构建部署

### test 环境

推送 test 分支，自动构建,手动部署

### 线上发布

推送 tag ,自动构建，手动部署预发布

#### 实例

1. `npm version [tag]`,更新版本号
2. `git push origin [tag]`, 上传 tag
3. CD 平台填写发布工单，前端 tag： `release/[tag]`

> CD 平台使用版本号进行发布，故从 gitlab 中检出指定版本(tag)，读取该 tag 下 dist.zip, 解压到 Nginx 对应目录下，实现发布。回滚同理，检出上一个 tag。后期考虑迁移到 docker 发布。

### 问题

1. gitlab ci 账户没有推送权限
2. gitlab submodule 只支持相对的路径
3. gitlab ci 构建慢，性能
4. 运维添加 dev ,test 环境的 ssh key
