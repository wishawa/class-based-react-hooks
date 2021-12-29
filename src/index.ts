import { useLayoutEffect, useRef, useState } from 'react';

type Rerender = (func: (num: number) => number) => void;
type Callback = () => void;

function increment(num: number): number {
	return num + 1;
}
export abstract class ReactHook<Args extends any[], State extends {}, Return> {
	constructor(args: Args, state: State) {
		this.args = args;
		this.state = state;
		this._prevArgs = args;
		this._prevState = state;
		this._nextState = state;
	}
	protected state: State;
	protected args: Args;

	protected forceUpdate(callback?: Callback) {
		this._updater();
		if (callback) this._updateCallbacks.push(callback);
	}
	protected setState(update: Partial<State>) {
		this._nextState = {
			...this._nextState,
			...update,
		};
		this.forceUpdate();
	}

	abstract render(): Return;

	/* tslint:disable:no-empty */
	protected hookWillMount() {}
	protected hookDidMount() {}
	protected hookWillUpdate(nextArgs: Args, nextState: State) {}
	protected hookDidUpdate(prevArgs: Args, prevState: State) {}
	protected hookWillUnmount() {}
	/* tslint:enable:no-empty */

	protected getDerivedStateFromArgs(
		this: {},
		nextArgs: Args,
		prevState: State
	): null | Partial<State> {
		return null;
	}

	private _prevState: State;
	private _prevArgs: Args;
	private _nextState: State;
	private _didMountRan: boolean = false;
	private _updateCallbacks: Callback[] = [];
	private _updater: () => void = () => undefined;
	__internal_beforeFirstRender(updater: Rerender) {
		this._updater = () => updater(increment);
		this.hookWillMount();
	}
	__internal_beforeSubsequentRender(nextArgs: Args) {
		this.hookWillUpdate(nextArgs, this._nextState);
		this._prevArgs = this.args;
		this._prevState = this.state;
		this.args = nextArgs;
		this.state = this._nextState;
	}
	__internal_deriveStateAndRender(): Return {
		const derived = this.getDerivedStateFromArgs(this.args, this.state);
		if (derived) this.state = { ...this.state, ...derived };
		return this.render();
	}
	/* tslint:disable-next-line:variable-name */
	__internal_afterRender = (): void => {
		if (!this._didMountRan) {
			this._didMountRan = true;
			this.hookDidMount();
		} else {
			this.hookDidUpdate(this._prevArgs, this._prevState);
		}
		while (this._updateCallbacks.length) this._updateCallbacks.pop()?.();
	};
	/* tslint:disable-next-line:variable-name */
	__internal_unmountEffect = (): (() => void) => {
		return this.hookWillUnmount.bind(this);
	};
}

type HookClass<Args extends any[], State extends {}, Return> = new (
	args: Args
) => ReactHook<Args, State, Return>;

type HookFunction<Args extends any[], Return> = (...args: Args) => Return;

const EMPTY_DEPS: [] = [];
export function createHook<Args extends any[], State extends {}, Return>(
	Class: HookClass<Args, State, Return>
): HookFunction<Args, Return> {
	return (...args: Args) => {
		const rerender: Rerender = useState<number>(1)[1];
		const instanceRef = useRef<null | ReactHook<Args, State, Return>>(null);
		let instance: ReactHook<Args, State, Return>;
		if (!instanceRef.current) {
			instance = new Class(args);
			instanceRef.current = instance;
			instance.__internal_beforeFirstRender(rerender);
		} else {
			instance = instanceRef.current;
			instance.__internal_beforeSubsequentRender(args);
		}

		const result = instance.__internal_deriveStateAndRender();

		useLayoutEffect(instance.__internal_afterRender);
		useLayoutEffect(instance.__internal_unmountEffect, EMPTY_DEPS);
		return result;
	};
}
