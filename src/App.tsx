import { getCurrentWindow } from "@tauri-apps/api/window";
import { BaseDirectory, readTextFile } from "@tauri-apps/plugin-fs";
import {
	Accessor,
	For,
	JSX,
	Match,
	Switch,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import { match, P } from "ts-pattern";

type Option = {
	description: string;
	shortcut: string;
} & (
	| {
			script: string;
			shell?: string;
	  }
	| {
			run: string;
			args?: string[];
	  }
	| {
			switch: string;
	  }
);

type Config = {
	max_rows?: number;
	max_columns?: number;
	margin?: number;
	spacing?: number;
	shell?: string;
	font?: {
		description?: {
			family?: string;
			style?: string;
			size?: number;
		};
		shortcut?: {
			family?: string;
			style?: string;
			size?: number;
		};
	};
	start_state?: string;
	options?: Record<string, Option[]>;
};

function App() {
	const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
	const [config, setConfig] = createSignal<Config | null>(null);
	const [isLoading, setIsLoading] = createSignal<boolean>(false);

	const [state, setState] = createSignal<string>("");

	async function readConfig() {
		setIsLoading(true);

		try {
			const text = await readTextFile("chorder/config.json", {
				baseDir: BaseDirectory.Config,
			});

			const config: Config = JSON.parse(text);

			setState(config.start_state || "main");

			setConfig(config);
		} catch (error) {
			setErrorMessage((error as Error).toString());
		} finally {
			setIsLoading(false);
		}
	}

	function keypressListener(event: KeyboardEvent) {
		try {
			const input = event.key.toLowerCase();

			const isQuit = input === "q" || input === "escape";

			const key = [event.ctrlKey && "c", event.shiftKey && "s", input]
				.filter(Boolean)
				.join("-");

			const configuration = config();

			match({ key, isQuit })
				.with({ isQuit: true }, () => {
					getCurrentWindow().hide();
					setState(configuration?.start_state ?? "main");
				})
				.with({ key: P.string.regex(/[a-pr-zA-PR-Z]/) }, ({ key }) => {
					const foundAction = configuration?.options?.[state()]?.find(
						({ shortcut }) => shortcut === key,
					);

          match(foundAction)
            .with({switch: P.nonNullable}, ({switch: newState}) => {
              setState(newState)
            })
            .run()
				})
				.run();
		} catch {
			// ignore errors
		}
	}

	onMount(() => {
		readConfig();

		document.addEventListener("keydown", keypressListener);
	});

	onCleanup(() => {
		document.removeEventListener("keydown", keypressListener);
	});

	const gridStyle: Accessor<JSX.CSSProperties> = () => ({
		"grid-template-columns": `repeat(${config()?.max_columns ?? 3}, minmax(0, 1fr))`,
		"grid-template-rows": `repeat(${config()?.max_rows ?? 3}, minmax(0, 1fr))`,
		padding: `${config()?.margin ?? 0}px`,
		gap: `${config()?.spacing ?? 0}px`,
	});

	const cellShortcutStyle: Accessor<JSX.CSSProperties> = () => ({
		"font-family": config()?.font?.shortcut?.family ?? "monospace",
		"font-style": config()?.font?.shortcut?.style ?? "bold",
		"font-size": `${config()?.font?.shortcut?.size ?? 24}px`,
	});

	const cellDescriptionStyle: Accessor<JSX.CSSProperties> = () => ({
		"font-family": config()?.font?.description?.family ?? "monospace",
		"font-style": config()?.font?.description?.style ?? "bold",
		"font-size": `${config()?.font?.description?.size ?? 24}px`,
	});

	return (
		<main class="w-full h-full">
			<Switch>
				<Match when={isLoading()}>
					<h1>Loading</h1>
				</Match>
				<Match when={errorMessage()}>
					<h1>{errorMessage()}</h1>
				</Match>
				<Match when={config()}>
					<div
						class="grid w-full h-full bg-gray-100 dark:bg-gray-800"
						style={gridStyle()}
					>
						<For each={config()?.options[state()] ?? []}>
							{(item) => (
								<div class="w-full h-full bg-gray-300 dark:bg-gray-700 text-black dark:text-white gap-4 flex flex-col justify-center items-center">
									<span style={cellShortcutStyle()}>{item.shortcut}</span>
									<span style={cellDescriptionStyle()}>{item.description}</span>
								</div>
							)}
						</For>
					</div>
				</Match>
			</Switch>
		</main>
	);
}

export default App;
