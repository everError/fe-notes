<script lang="ts">
	let socket: WebSocket | null = null;
	let messages: string[] = [];
	let isConnected: boolean = false;
	let messageInput: string = '';

	function connectWebSocket() {
		socket = new WebSocket('ws:localhost:5000/ws'); // 웹소켓 서버 주소 변경 필요

		socket.onopen = () => {
			isConnected = true;
			messages = [...messages, '✅ 웹소켓 연결됨'];
		};

		socket.onmessage = (event: MessageEvent) => {
			messages = [...messages, '📩 서버 응답: ' + event.data];
		};

		socket.onerror = (error: Event) => {
			messages = [...messages, '⚠️ 웹소켓 오류 발생'];
		};

		socket.onclose = () => {
			isConnected = false;
			messages = [...messages, '❌ 웹소켓 연결 종료'];
		};
	}

	function sendMessage() {
		if (socket && isConnected && messageInput.trim() !== '') {
			socket.send(messageInput);
			messages = [...messages, '📤 보낸 메시지: ' + messageInput];
			messageInput = ''; // 메시지 전송 후 입력 필드 초기화
		} else {
			messages = [...messages, '⚠️ 웹소켓 연결이 필요합니다.'];
		}
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center p-4">
	<div class="w-96 rounded-lg p-6 shadow-xl">
		<h2 class="mb-4 text-center text-2xl font-semibold">웹소켓 테스트</h2>

		<button on:click={connectWebSocket} class="btn btn-primary mb-2 w-full"> 웹소켓 연결 </button>

		<div class="mt-2 flex space-x-2">
			<input
				type="text"
				bind:value={messageInput}
				placeholder="보낼 메시지 입력..."
				class="input input-bordered flex-1"
			/>
			<button on:click={sendMessage} class="btn btn-secondary"> 전송 </button>
		</div>

		<div class="mt-3 h-40 overflow-y-auto rounded-lg border p-3">
			<h3 class="font-semibold">📜 응답 로그</h3>
			{#each messages as msg}
				<p class="text-sm text-gray-100">{msg}</p>
			{/each}
		</div>
	</div>
</div>
