import { act, renderHook } from '@testing-library/react-hooks';
import { createHook, ReactHook } from '..';

type Args<Data, Key> = [Key, (key: Key) => Promise<Data>];
type State<Data> = {
	data: Data | undefined;
	error: unknown | undefined;
};
type Returns<Data> = {
	data: Data | undefined;
	error: unknown | undefined;
	isValidating: boolean;
	mutate: (newData?: Data, shouldRevalidate?: boolean) => void;
};

class UseMiniSWR<Data, Key> extends ReactHook<
	Args<Data, Key>,
	State<Data>,
	Returns<Data>
> {
	constructor(args: Args<Data, Key>) {
		super(args, {
			data: undefined,
			error: undefined,
		});
	}
	_lastRequestId: number = 1;
	_isRequestActive: boolean = true;
	_fetchData = async (key: Key) => {
		const requestId = ++this._lastRequestId;
		this._isRequestActive = true;
		const update: Partial<State<Data>> = {};
		try {
			const data = await this.args[1](key);
			update.data = data;
			update.error = undefined;
		} catch (error) {
			update.error = error;
		}
		if (this._lastRequestId === requestId) {
			this._isRequestActive = false;
			this.setState(update);
		}
	};
	hookWillMount(): void {
		this._fetchData(this.args[0]);
	}
	hookWillUpdate(nextArgs: Args<Data, Key>, nextState: State<Data>): void {
		if (nextArgs[0] !== this.args[0]) {
			this._fetchData(nextArgs[0]);
		}
	}
	_mutate = (newData?: Data, shouldRevalidate?: boolean) => {
		const update: Partial<State<Data>> = {};
		if (newData) {
			update.data = newData;
		}
		if (shouldRevalidate) {
			this._fetchData(this.args[0]);
		}
		this.setState(update);
	};
	render(): Returns<Data> {
		return {
			data: this.state.data,
			error: this.state.error,
			isValidating: this._isRequestActive,
			mutate: this._mutate,
		};
	}
}
const useMiniSWR = createHook(UseMiniSWR);

function mockFetch(text: string): Promise<string> {
	return new Promise((resolve, _reject) => {
		setTimeout(() => {
			resolve(`Hello, ${text}!`);
		}, 100);
	});
}
test('fetch-data', async () => {
	const { result, rerender, waitForNextUpdate } = renderHook(
		({ text }) => useMiniSWR(text, mockFetch),
		{
			initialProps: {
				text: 'World',
			},
		}
	);
	expect(result.current.data).toBe(undefined);
	expect(result.current.isValidating).toBe(true);
	await waitForNextUpdate();
	expect(result.current.data).toBe('Hello, World!');
	expect(result.current.isValidating).toBe(false);
	rerender({
		text: 'Hooks',
	});
	expect(result.current.isValidating).toBe(true);
	await waitForNextUpdate();
	expect(result.current.data).toBe('Hello, Hooks!');
	expect(result.current.isValidating).toBe(false);
});
test('mutate', async () => {
	const { result, waitForNextUpdate } = renderHook(
		({ text }) => useMiniSWR(text, mockFetch),
		{
			initialProps: {
				text: 'World',
			},
		}
	);
	act(() => {
		result.current.mutate('Hi!', true);
	});
	expect(result.current.data).toBe('Hi!');
	await waitForNextUpdate();
	expect(result.current.data).toBe('Hello, World!');
});
