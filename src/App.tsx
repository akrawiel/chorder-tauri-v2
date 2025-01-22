import { defaultWindowIcon } from "@tauri-apps/api/app";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { Menu } from "@tauri-apps/api/menu";
import { homeDir } from "@tauri-apps/api/path";
import { TrayIcon } from "@tauri-apps/api/tray";
import {
	UserAttentionType,
	getAllWindows,
	getCurrentWindow,
} from "@tauri-apps/api/window";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { BaseDirectory, readTextFile, stat } from "@tauri-apps/plugin-fs";
import { exit } from "@tauri-apps/plugin-process";
import { Command } from "@tauri-apps/plugin-shell";
import {
	type Accessor,
	For,
	type JSX,
	Match,
	Switch,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import { P, match } from "ts-pattern";

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
	window?: {
		width?: number;
		height?: number;
	};
	font?: {
		description?: {
			family?: string;
			weight?: string | number;
			size?: number;
		};
		shortcut?: {
			family?: string;
			weight?: string | number;
			size?: number;
		};
	};
	start_state?: string;
	options?: Record<string, Option[]>;
};

function App() {
	const [trayIcon, setTrayIcon] = createSignal<TrayIcon | null>(null);
	const [closeRequestUnlistenFn, setCloseRequestUnlistenFn] =
		createSignal<UnlistenFn | null>(null);
	const [openUrlUnlistenFn, setOpenUrlUnlistenFn] =
		createSignal<UnlistenFn | null>(null);

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
		event.preventDefault();

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
						.with({ run: P.nonNullable }, ({ run, args }) => {
							const finalShell = config()?.shell;

							if (!finalShell) {
								return;
							}

							homeDir().then((home) => {
								Command.create(`script${finalShell}`, [
									"-c",
									`${run.replace("$HOME", home)} ${(args ?? []).join(" ")}`.trim(),
								]).execute();
							});
							getCurrentWindow().hide();
							setState(config()?.start_state ?? "main");
						})
						.with({ script: P.nonNullable }, ({ script, shell }) => {
							const finalShell = shell ?? config()?.shell;

							if (!finalShell) {
								return;
							}

							homeDir().then((home) => {
								Command.create(`run${finalShell}`, [
									script.replace("$HOME", home),
								]).execute();
							});

							getCurrentWindow().hide();
							setState(config()?.start_state ?? "main");
						})
						.with({ switch: P.nonNullable }, ({ switch: newState }) => {
							setState(newState);
						})
						.run();
				})
				.run();
		} catch {
			// ignore errors
		}
	}

	async function createTray() {
		try {
			return await TrayIcon.new({
				icon: (await defaultWindowIcon()) ?? undefined,
				menu: await Menu.new({
					items: [
						{
							id: "toggle",
							text: "Toggle Chorder",
							action: async () => {
								for (const window of await getAllWindows()) {
									window.show();
									window.requestUserAttention(UserAttentionType.Informational);
								}
							},
						},
						{
							id: "quit",
							text: "Quit",
							action: () => {
								exit(0);
							},
						},
					],
				}),
				menuOnLeftClick: true,
			});
		} catch (e) {
			console.warn(e);
			return null;
		}
	}

	onMount(() => {
		readConfig();

		document.addEventListener("keydown", keypressListener);

		createTray().then((newTrayIcon) => {
			setTrayIcon(newTrayIcon);
		});

		getCurrentWindow()
			.onCloseRequested((event) => {
				event.preventDefault();
				getCurrentWindow().hide();
				setState(config()?.start_state ?? "main");
			})
			.then((newUnlistenFn) => {
				setCloseRequestUnlistenFn(() => newUnlistenFn);
			});

		onOpenUrl(() => {
			getAllWindows().then((allWindows) => {
				for (const window of allWindows) {
					window.show();
					window.requestUserAttention(UserAttentionType.Informational);
				}
			});
		}).then((newUnlistenFn) => {
			setOpenUrlUnlistenFn(() => newUnlistenFn);
		});
	});

	onCleanup(() => {
		document.removeEventListener("keydown", keypressListener);

		trayIcon()?.close();
		closeRequestUnlistenFn()?.();
		openUrlUnlistenFn()?.();
	});

	const gridStyle: Accessor<JSX.CSSProperties> = () => ({
		"grid-template-columns": `repeat(${config()?.max_columns ?? 3}, minmax(0, 1fr))`,
		"grid-template-rows": `repeat(${config()?.max_rows ?? 3}, minmax(0, 1fr))`,
		padding: `${config()?.margin ?? 0}px`,
		gap: `${config()?.spacing ?? 0}px`,
	});

	const cellShortcutStyle: Accessor<JSX.CSSProperties> = () => ({
		"font-family": config()?.font?.shortcut?.family ?? "monospace",
		"font-weight": config()?.font?.shortcut?.weight ?? 700,
		"font-size": `${config()?.font?.shortcut?.size ?? 24}px`,
	});

	const cellDescriptionStyle: Accessor<JSX.CSSProperties> = () => ({
		"font-family": config()?.font?.description?.family ?? "monospace",
		"font-weight": config()?.font?.description?.weight ?? 400,
		"font-size": `${config()?.font?.description?.size ?? 12}px`,
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
