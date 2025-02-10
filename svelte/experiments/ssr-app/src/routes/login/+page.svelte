<script>
	let username = '';
	let password = '';
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="card w-96 rounded-lg p-6 shadow-xl">
		<h2 class="mb-4 text-center text-2xl font-semibold">로그인</h2>
		<form>
			<div class="form-control">
				<label for="username" class="label"><span class="label-text">아이디</span></label>
				<input
					id="username"
					type="text"
					bind:value={username}
					class="input input-bordered w-full"
					placeholder="아이디 입력"
					required
				/>
			</div>
			<div class="form-control mt-2">
				<label for="password" class="label"><span class="label-text">비밀번호</span></label>
				<input
					id="password"
					type="password"
					bind:value={password}
					class="input input-bordered w-full"
					placeholder="비밀번호 입력"
					required
				/>
			</div>
			<button class="btn btn-primary mt-4 w-full" type="submit">로그인</button>
		</form>

		<p class="mt-2 text-center text-sm">
			계정이 없으신가요? <a href="/register" class="text-blue-500">회원가입</a>
		</p>
	</div>
</div>
