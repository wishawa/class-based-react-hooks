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
	hookWillMount() {}
	hookDidMount() {}
	hookWillUpdate(nextArgs: Args, nextState: State) {}
	hookDidUpdate(prevArgs: Args, prevState: State) {}
	hookWillUnmount() {}
	/* tslint:enable:no-empty */

	getDerivedStateFromArgs(
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
	_beforeFirstRender(updater: Rerender) {
		this._updater = () => updater(increment);
		this.hookWillMount();
	}
	_beforeSubsequentRender(nextArgs: Args) {
		this.hookWillUpdate(nextArgs, this._nextState);
		this._prevArgs = this.args;
		this._prevState = this.state;
		this.args = nextArgs;
		this.state = this._nextState;
	}
	_deriveStateAndRender(): Return {
		const derived = this.getDerivedStateFromArgs(this.args, this.state);
		if (derived) this.state = { ...this.state, ...derived };
		return this.render();
	}
	_afterRender = (): void => {
		if (!this._didMountRan) {
			this._didMountRan = true;
			this.hookDidMount();
		} else {
			this.hookDidUpdate(this._prevArgs as Args, this._prevState as State);
		}
		while (this._updateCallbacks.length) this._updateCallbacks.pop()?.();
	};
	_unmountEffect = (): (() => void) => {
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
			instance._beforeFirstRender(rerender);
		} else {
			instance = instanceRef.current;
			instance._beforeSubsequentRender(args);
		}

		const result = instance._deriveStateAndRender();

		useLayoutEffect(instance._afterRender);
		useLayoutEffect(instance._unmountEffect, EMPTY_DEPS);
		return result;
	};
}
