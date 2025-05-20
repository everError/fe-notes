# JavaScript Generator 문법 정리

JavaScript의 Generator는 함수의 실행을 중간에 멈췄다가 다시 재개할 수 있는 기능을 제공합니다. 이 기능은 `function*` 키워드와 `yield` 키워드를 통해 구현되며, \*\*이터러블(iterable)\*\*과 \*\*이터레이터(iterator)\*\*를 간편하게 정의할 수 있습니다.

## 1. 기본 문법

```js
function* generatorFunction() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = generatorFunction();
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }
console.log(gen.next()); // { value: 3, done: false }
console.log(gen.next()); // { value: undefined, done: true }
```

- `function*` : Generator 함수 선언
- `yield` : 중간에 멈추는 지점 지정
- `gen.next()` : 함수 실행을 다음 `yield` 지점까지 진행

## 2. 반복 가능한 이터레이터 구현

```js
function* countUpTo(limit) {
  for (let i = 0; i <= limit; i++) {
    yield i;
  }
}

for (const value of countUpTo(3)) {
  console.log(value); // 0, 1, 2, 3
}
```

## 3. `yield`는 표현식

```js
function* double() {
  const x = yield 10;
  yield x * 2;
}

const gen = double();
console.log(gen.next()); // { value: 10, done: false }
console.log(gen.next(5)); // { value: 10, done: false } → x = 5
console.log(gen.next()); // { value: undefined, done: true }
```

## 4. `return`을 사용하여 종료 값 반환

```js
function* finish() {
  yield 1;
  return 42;
}

const gen = finish();
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 42, done: true }
```

## 5. Generator로 비동기 흐름 관리

```js
function* asyncFlow() {
  const user = yield fetch("/api/user");
  const posts = yield fetch(`/api/posts?user=${user.id}`);
  return posts;
}
```

> 실제 사용은 `co` 라이브러리, 또는 async/await로 대체됨.

## 6. Generator와 Symbol.iterator

```js
const iterableObj = {
  *[Symbol.iterator]() {
    yield "a";
    yield "b";
    yield "c";
  },
};

for (const val of iterableObj) {
  console.log(val); // a, b, c
}
```

## 7. Generator의 활용 예시

- 커스텀 이터레이터 작성
- 상태 머신 구현
- 중단 가능한 비동기 제어 흐름
- lazy evaluation (지연 계산)

## 8. 참고 사항

- Generator는 이터레이터이자 이터러블이다
- `next(value)`로 외부에서 값을 주입할 수 있다
- `yield*` 를 사용하면 다른 generator를 위임 실행할 수 있다

```js
function* subGen() {
  yield "x";
  yield "y";
}

function* mainGen() {
  yield "a";
  yield* subGen();
  yield "z";
}
```

---

Generator는 복잡한 제어 흐름이나 이터레이션 로직을 간결하고 유연하게 만들어주는 강력한 도구입니다.
