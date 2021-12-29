import { act, renderHook } from '@testing-library/react-hooks';
import { createHook, ReactHook } from '..';

type Todo = {
	id: number;
	content: string;
	completed: boolean;
};
type State = {
	todos: Todo[];
};
type Return = {
	todos: Todo[];
	reducer: UseTodosReduer;
};
class UseTodosReduer extends ReactHook<[], State, Return> {
	constructor(args: []) {
		super(args, {
			todos: [],
		});
	}
	private runningId = 1;
	public addTodo = (content: string) => {
		this.setState({
			todos: [
				...this.state.todos,
				{
					id: ++this.runningId,
					completed: false,
					content,
				},
			],
		});
	};
	public toggleTodo = (id: number) => {
		this.setState({
			todos: this.state.todos.map((todo) =>
				todo.id === id
					? {
							...todo,
							completed: !todo.completed,
					  }
					: todo
			),
		});
	};
	public toggleAllTodos = () => {
		const allCompleted = this.state.todos.every((todo) => todo.completed);
		this.setState({
			todos: this.state.todos.map((todo) => ({
				...todo,
				completed: !allCompleted,
			})),
		});
	};
	public clearCompletedTodos = () => {
		this.setState({
			todos: this.state.todos.filter((todo) => !todo.completed),
		});
	};
	render(): Return {
		return {
			todos: this.state.todos,
			reducer: this,
		};
	}
}
const useTodosReduccer = createHook(UseTodosReduer);
test('basic', () => {
	const { result } = renderHook(() => useTodosReduccer());
	act(() => result.current.reducer.addTodo('hi'));
	expect(result.current.todos).toEqual<Todo[]>([
		{ id: 2, content: 'hi', completed: false },
	]);
	act(() => result.current.reducer.clearCompletedTodos());
	expect(result.current.todos).toEqual<Todo[]>([
		{ id: 2, content: 'hi', completed: false },
	]);
	act(() => result.current.reducer.toggleAllTodos());
	expect(result.current.todos).toEqual<Todo[]>([
		{ id: 2, content: 'hi', completed: true },
	]);
	act(() => result.current.reducer.clearCompletedTodos());
	expect(result.current.todos).toEqual<Todo[]>([]);
});
