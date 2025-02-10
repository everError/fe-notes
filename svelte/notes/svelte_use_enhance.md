# SvelteKit `use:enhance` 정리

## 1. `use:enhance`란?

`use:enhance`는 SvelteKit에서 **서버에서 처리하는 폼 제출을 AJAX 방식으로 처리할 수 있도록 도와주는 기능**입니다.
기본적으로 `<form>` 태그를 사용하면 **페이지가 새로고침되며 데이터를 전송**하지만, `use:enhance`를 사용하면 **페이지를 새로고침하지 않고 부드럽게 데이터를 전송**할 수 있습니다.

---

## 2. `use:enhance`를 사용해야 하는 이유

| 기능                     | 일반 `<form>`    | `use:enhance` 적용 후      |
| ------------------------ | ---------------- | -------------------------- |
| **페이지 새로고침**      | ✅ 새로고침 발생 | ❌ 새로고침 없이 AJAX 처리 |
| **SSR 데이터 연동**      | ✅ 가능          | ✅ 가능                    |
| **빠른 사용자 경험**     | ❌ 느릴 수 있음  | ✅ 빠르게 전송             |
| **JavaScript 필요 여부** | ❌ 필요 없음     | ✅ 필요                    |

📌 **즉, `use:enhance`를 사용하면 서버 렌더링(SSR)의 장점을 유지하면서도 AJAX 방식으로 데이터를 제출할 수 있습니다.**

---

## 3. `use:enhance` 사용법

### 🔹 **1️⃣ 서버에서 폼 데이터를 처리 (`+page.server.ts`)**

```ts
import type { Actions } from "./$types";

export const actions: Actions = {
  login: async ({ request }) => {
    const formData = await request.formData();
    const username = formData.get("username");
    const password = formData.get("password");

    if (!username || !password) {
      return { error: "아이디와 비밀번호를 입력하세요." };
    }

    return { success: true };
  },
};
```

### 🔹 **2️⃣ 클라이언트에서 `use:enhance`를 활용 (`+page.svelte`)**

```svelte
<script>
  import { enhance } from '$app/forms';
</script>

<form method="POST" action="?/login" use:enhance>
  <input type="text" name="username" placeholder="아이디 입력" required />
  <input type="password" name="password" placeholder="비밀번호 입력" required />
  <button type="submit">로그인</button>
</form>
```

📌 **`use:enhance`를 추가하면 서버에 데이터를 전송하면서도, 새로고침 없이 결과를 반영할 수 있습니다.**

---

## 4. 결론

✔ `use:enhance`를 사용하면 **폼 제출 시 페이지 새로고침 없이 데이터 전송 가능**  
✔ **SSR과 AJAX 방식의 장점을 결합**하여 사용자 경험을 개선  
✔ **SvelteKit에서 `fetch`를 직접 호출하지 않고도 서버 데이터를 쉽게 처리 가능**
