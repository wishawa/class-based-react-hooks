import { act, cleanup, renderHook } from '@testing-library/react-hooks';
import { useEffect } from 'react';
import { createHook, ReactHook } from '..';

type Args = [number, MutLifecycleTracker];
type State = {
	num: number;
};
type Return = {
	update: (newState: number) => void;
};
type Lifecycle =
	| 'constructor'
	| 'hookWillMount'
	| 'getDerivedStateFromArgs'
	| 'render'
	| 'hookDidMount'
	| 'hookWillUpdate'
	| 'hookDidUpdate'
	| 'hookWillUnmount';
type MutLifecycleTracker = Lifecycle[];

class UseLifecycleTest extends ReactHook<Args, State, Return> {
	constructor(args: Args) {
		super(args, {
			num: args[0],
		});
		args[1].push('constructor');
	}
	hookWillMount(): void {
		this.args[1].push('hookWillMount');
	}
	getDerivedStateFromArgs(
		nextArgs: Args,
		prevState: State
	): null | Partial<State> {
		nextArgs[1].push('getDerivedStateFromArgs');
		return null;
	}
	render(): Return {
		this.args[1].push('render');
		return {
			update: this.update,
		};
	}
	hookDidMount(): void {
		this.args[1].push('hookDidMount');
	}
	hookWillUpdate(nextArgs: Args, nextState: State): void {
		this.args[1].push('hookWillUpdate');
	}
	hookDidUpdate(prevArgs: Args, prevState: State): void {
		this.args[1].push('hookDidUpdate');
	}
	hookWillUnmount(): void {
		this.args[1].push('hookWillUnmount');
	}
	update = (num: number) => {
		this.setState({
			num,
		});
	};
}
const useLifecycleTest = createHook(UseLifecycleTest);
test('mounting', () => {
	const tracker: MutLifecycleTracker = [];
	const { result, rerender } = renderHook(() => useLifecycleTest(3, tracker));
	expect(tracker).toEqual<MutLifecycleTracker>([
		'constructor',
		'hookWillMount',
		'getDerivedStateFromArgs',
		'render',
		'hookDidMount',
	]);
});
test('updating', () => {
	const tracker: MutLifecycleTracker = [];
	const { result, rerender } = renderHook(
		({ num }) => useLifecycleTest(num, tracker),
		{
			initialProps: {
				num: 42,
			},
		}
	);
	const expected: MutLifecycleTracker = [
		'hookWillUpdate',
		'getDerivedStateFromArgs',
		'render',
		'hookDidUpdate',
	];
	while (tracker.length) tracker.pop();
	rerender();
	expect(tracker).toEqual<MutLifecycleTracker>(expected);
	while (tracker.length) tracker.pop();
	rerender({ num: 43 });
	expect(tracker).toEqual<MutLifecycleTracker>(expected);
	while (tracker.length) tracker.pop();
	act(() => {
		result.current.update(46);
	});
	expect(tracker).toEqual<MutLifecycleTracker>(expected);
});
test('unmounting', () => {
	const tracker: MutLifecycleTracker = [];
	const { result, rerender, unmount } = renderHook(
		({ num }) => useLifecycleTest(num, tracker),
		{
			initialProps: {
				num: 42,
			},
		}
	);
	while (tracker.length) tracker.pop();
	unmount();
	expect(tracker).toEqual<MutLifecycleTracker>(['hookWillUnmount']);
});
