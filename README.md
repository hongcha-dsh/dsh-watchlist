<p align="center"><img src="assets/icon-180.png" width="96" alt="dsh-watchlist"></p>

# dsh-watchlist

在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）左侧边栏的对话列表上方加一块**关注区**：你在意的对话留在那里，不再被不断变长的列表挤下去。输入框的模型选择器左侧还有一个关注/结束关注按钮。

中文 | [English](#english)

## 它做什么

- **关注区在对话列表上方**，压在工作区区域上，并把下面的列表整体下推，两边都能用。
- **每行一个状态圆点**：绿色＝有新回复且你没看过；黄色＝这一轮结束了，在等你；蓝色闪烁＝正在运行；红色＝这一轮失败了。
- **排序贴合阅读习惯**：有新回复的对话置顶，正在运行的对话置底——它暂时不需要你做什么。
- **自动进入**：出现内容的新对话、重新发起的对话、刚结束一轮的对话、发出新提问的对话，都会自己进入关注区。**只有**点这一行的 X 或输入框旁的那个按钮才会离开。
- **行操作**：点这一行直接打开；鼠标悬停时出现两个按钮——圆点用于重新标记未读，X 用于结束关注。不悬停时不占位，整行看上去就是「圆点＋标题」。
- **高度跟着条数走**：有几条就铺几条，只有当它会占满整列、把工作区挤到没有时，才改为自己内部滚动。

## 安装

```sh
dsh plugin add github:hongcha-dsh/dsh-watchlist
```

装完重启 Harness：前端在下次加载页面时生效，Host 那一半需要重启。

要求：带 Web UI 的 `dsh`（用到客户端插槽 `shell.overlay`、`conversation.input.right`，以及 `uiSession` / `uiWorkspace` 服务）。开发和实际使用都在 `0.2.1-rc` 上。

## 圆点是怎么判定的

一个会话只有一个圆点，按优先级：

| 圆点 | 含义 | 判定方式 |
| --- | --- | --- |
| 黄色 | 在等你 | 会话报告了待处理的交互 |
| 红色 | 失败 | Host 记录到该会话有一轮失败 |
| 蓝色（闪烁） | 运行中 | 状态表或会话列表显示正在运行 |
| 绿色 | 未读 | 有新回复，而当时你没在看着这条对话 |
| 灰色 | 空闲 | 已关注，没有新动静 |

「未读」在你真正打开那一条对话时清除，不是按时间清除；如果那一条本来就显示在屏幕上，它结束一轮也不会变成未读。

## 排序

正在运行的对话排在最后。其余按最近一次活动的排序戳倒序，所以刚收到的回复会把那一行顶到最上面。排序戳只会变大：同一毫秒内的两次回复也能保持稳定顺序，重新关注一条对话也不会把它埋到已有行下面。

## 它存在哪里

浏览器 profile 里的 `localStorage["dsh-watchlist:v1"]`：关注的 id、未读的 id、排序戳。没有服务端状态，也不跨浏览器同步，清站点数据就重置。

子代理（subagent）的子会话不进关注区——分派工作不该多出一行；fork 出来的对话是普通对话，可以关注。

## Host 那一半

前端几乎全部状态都从它已有的 store 里推导。它唯一看不到的，是没有显示在屏幕上的会话里出现的那一轮失败。所以 Host 那一半监听 `agent/error` 与 `api-session/error`，保留最近 64 条，用 `GET /plugins/dsh-watchlist/failures` 提供给页面（仅同源，`no-store`）。

页面每秒轮询一次这个路由。这个轮询同时是看门狗：它会重读会话列表和状态表，所以从输入框刚发出去的提问，在列表还没重新发布之前也能被算进去。

## 致谢

状态图标是四种动作的鲸鱼尾巴，移植自 [dsh-status-rotator](https://github.com/01Virex/dsh-status-rotator)（MIT，Copyright (c) 2026 01Virex）：帧序列重采样（每种动作 150 → 100 帧），轮廓简化为 120×95 viewBox 内的 96 个整数点，由 CSS `d:` 关键帧配 `steps(1, end)` 驱动。动画跟着状态走：未读翻尾、待回复扭转、运行中左右摆。

## 许可证

MIT，见 [LICENSE](LICENSE)。

---

## English

A follow list above the sidebar's conversation list for DeepSeek Harness (`dsh`).

Conversations you care about stay in one place at the top of the left sidebar, each with a status dot, instead of sinking down a list that keeps growing. A follow toggle also sits beside the model selector in the composer.

### What it does

- **A watched area above the conversation list.** It is pinned over the sidebar's workspace region and pushes the list below it down, so both stay usable.
- **Status dots per row.** Green: a reply arrived that you haven't opened. Yellow: the turn ended and it is waiting for you. Blue, blinking: it is running. Red: the turn failed.
- **Ordering that matches how you read.** A conversation with news rises to the top; conversations that are running sink to the bottom, because they need nothing from you yet.
- **Rows join on their own.** A new conversation with content, a re-started one, a finished turn, and a new prompt all put that conversation in the area. Leaving is explicit only: the row's X, or the composer toggle.
- **Row actions.** Click a row to open it. Hover for two buttons: the dot marks it unread again, the X unfollows it. Both are hidden until hover, so the row reads as a title with a dot.
- **The area grows with the list.** Its height follows the number of followed conversations; it only starts scrolling when it would otherwise take the whole sidebar column.

### Install

```sh
dsh plugin add github:hongcha-dsh/dsh-watchlist
```

Then restart Harness. The Client half is served on the next page load; the Host half needs the restart.

Requirements: a `dsh` build with the Web UI (the plugin uses the client slots `shell.overlay` and `conversation.input.right`, and the `uiSession` / `uiWorkspace` services). Developed and used against `0.2.1-rc`.

### Which conversation gets which dot

One dot per row, chosen by this priority:

| Dot | Meaning | How it is decided |
| --- | --- | --- |
| Yellow | waiting for you | the session reports a pending interaction |
| Red | failed | the Host recorded a failed turn for that session |
| Blue (blinking) | running | the session is running, per the status map or the list |
| Green | unread | a reply arrived while you were not looking at that conversation |
| Grey | idle | followed, nothing new |

Unread clears when you arrive at the conversation, not on a timer. A conversation that is already on screen does not become unread when its turn ends.

### Ordering

Conversations that are running sort last. Everything else sorts by the stamp of its latest activity, newest first, so a reply you just received puts that row at the top. Stamps only grow: two replies in the same millisecond keep a stable order, and re-following a conversation cannot bury it under rows that were already there.

### What it stores

`localStorage["dsh-watchlist:v1"]` in the browser profile: followed ids, unread ids, and the ordering stamps. There is no server-side state and no sync between browsers. Clearing site data resets the area.

Subagent child sessions are excluded: delegating work should not add rows. Forks are ordinary conversations and can be followed.

### The Host half

The Client derives almost everything from stores it already has. The one thing it cannot see is a failed turn of a session it is not displaying, so the Host half listens for `agent/error` and `api-session/error`, keeps the last 64 failures, and serves them at `GET /plugins/dsh-watchlist/failures` (same-origin only, `no-store`).

The page polls that route about once a second. That poll is also the watchdog: it re-reads the session list and the status map, so a prompt sent from the composer counts even before the list republishes.

### Credits

The status marks are a whale tail in four motion variants, ported from [dsh-status-rotator](https://github.com/01Virex/dsh-status-rotator) (MIT, Copyright (c) 2026 01Virex). Frames were resampled (150 → 100 per action) and their outlines simplified to 96 integer points in a 120×95 viewBox, then driven by CSS `d:` keyframes with `steps(1, end)`. The animation follows the row's state: unread flips, waiting twists, running sways.

### License

MIT. See [LICENSE](LICENSE).
