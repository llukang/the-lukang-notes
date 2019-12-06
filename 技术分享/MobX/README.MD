# Mobx

## 前言

目前 React 和 Redux 开发，是前端业内很普遍的一种项目解决方案。本着学习和变换思路的目的，给大家分享一下 React 和 Mobx 这种数据状态管理模式。

> GitHub 上 [Mobx](https://github.com/Mobxjs/Mobx) 拥有 **20.9k**，[Redux](https://github.com/Reduxjs/Redux) 拥有 **51.6k**

Mobx 是一个透明函数响应式编程的状态管理库，它使得状态管理简单可伸缩。学习成本低，上手快，基础知识简单，跟 Vue 一样的核心原理（响应式编程）。写更少的代码，完成更多的事，不用和 Redux 一样写非常多的样板代码。面向对象编程，具有响应式能力(计算属性&监听)

### 数据流转 & 状态更新

<!-- **Mobx** -->

![数据流转](./images/flow.png)

<!-- **Redux** -->

<!-- ![数据流转](./images/Redux.png) -->

### 基本使用

```bash
npm install Mobx Mobx-react --save
```

1. store 声明

```javascript
import { observable, computed, autorun } from "mobx";

class ObservableTodoStore {
  // Observable state(可观察的状态)
  @observable todos = [];
  @observable pendingRequests = 0;

  constructor() {
    // Reactions(反应)
    Mobx.autorun(() => console.log(this.report));
  }

  // Computed values(计算值)
  @computed get completedTodosCount() {
    return this.todos.filter(todo => todo.completed === true).length;
  }

  @computed get report() {
    if (this.todos.length === 0) return "<none>";
    return (
      `Next todo: "${this.todos[0].task}". ` +
      `Progress: ${this.completedTodosCount}/${this.todos.length}`
    );
  }

  addTodo(task) {
    this.todos.push({
      task: task,
      completed: false,
      assignee: null
    });
  }
}

const observableTodoStore = new ObservableTodoStore();
```

2. React 数据注入

```javascript
import { observer } from "mobx-react";

@observer
class TodoList extends React.Component {
  render() {
    // 注入 store
    const store = this.props.store;
    return (
      <div>
        {store.report}
        <ul>
          {store.todos.map((todo, idx) => (
            <TodoView todo={todo} key={idx} />
          ))}
        </ul>
        {store.pendingRequests > 0 ? <marquee>Loading...</marquee> : null}
        <button onClick={this.onNewTodo}>New Todo</button>
        <small> (double-click a todo to edit)</small>
        <RenderCounter />
      </div>
    );
  }

  onNewTodo = () => {
    this.props.store.addTodo(prompt("Enter a new todo:", "coffee plz"));
  };
}

@observer
class TodoView extends React.Component {
  render() {
    const todo = this.props.todo;
    return (
      <li onDoubleClick={this.onRename}>
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={this.onToggleCompleted}
        />
        {todo.task}
        {todo.assignee ? <small>{todo.assignee.name}</small> : null}
        <RenderCounter />
      </li>
    );
  }

  onToggleCompleted = () => {
    const todo = this.props.todo;
    todo.completed = !todo.completed;
  };

  onRename = () => {
    const todo = this.props.todo;
    todo.task = prompt("Task name", todo.task) || todo.task;
  };
}

ReactDOM.render(
  <TodoList store={observableTodoStore} />,
  document.getElementById("#root")
);
```

#### Mobx 与 Redux

- store 存储：Redux 是单个 store，Mobx 可以是多个
- 数据结构：Redux 使用正常的 对象，而 Mobx 进行包裹，得到 observable 数据
- 编程方式：Redux 函数式编程，Mobx 面向对象编程
- immutable：Redux 要求数据的不可变形，而 Mobx 则不坐要求
- action：Redux 通过 action 来驱动数据的变化，是必选项，而 Mobx 则为可选项
- 代码量：Mobx 代码量小，可以快速完成简单业务开发
- 耦合性：Redux 耦合度低，可以便于复用，也方便进行单元测试
- 生态环境：Redux 的生态环境优于 Mobx
- 使用场景：Mobx 适用于简单的业务，快速完成开发；Redux 适用于复杂场景
- 开发体验：Mobx 类 vue 开发，响应式。在不使用 dva 的情况下
