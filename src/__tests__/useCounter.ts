import { ReactHook, createHook } from '../';
import { renderHook, act } from '@testing-library/react-hooks';
type State = {
	num: number;
};
type Return = {
	num: number;
	increment: (by?: number) => void;
	reset: () => void;
};
class UseCounter extends ReactHook<[number], State, Return> {
	constructor(args: [number]) {
		super(args, {
			num: args[0],
		});
	}
	increment = (by: number = 1) => {
		this.setState({
			num: this.state.num + by,
		});
	};
	reset = () => {
		this.setState({
			num: this.args[0],
		});
	};
	render() {
		return {
			num: this.state.num,
			increment: this.increment,
			reset: this.reset,
		};
	}
}
const useCounter = createHook(UseCounter);

test('increment', () => {
	const { result, rerender } = renderHook(
		({ initialValue }) => useCounter(initialValue),
		{
			initialProps: { initialValue: 0 },
		}
	);
	expect(result.current.num).toBe(0);
	rerender();
	expect(result.current.num).toBe(0);
	act(() => {
		result.current.increment(3);
	});
	expect(result.current.num).toBe(3);
	rerender();
	expect(result.current.num).toBe(3);
	act(() => {
		result.current.increment();
	});
	expect(result.current.num).toBe(4);
});
test('reset', () => {
	const { result, rerender } = renderHook(
		({ initialValue }) => useCounter(initialValue),
		{
			initialProps: { initialValue: 0 },
		}
	);
	act(() => {
		result.current.increment();
	});
	expect(result.current.num).toBe(1);
	act(() => result.current.reset());
	expect(result.current.num).toBe(0);
	rerender({ initialValue: 20 });
	expect(result.current.num).toBe(0);
	act(() => result.current.reset());
	expect(result.current.num).toBe(20);
	act(() => result.current.increment(3));
	expect(result.current.num).toBe(23);
});
