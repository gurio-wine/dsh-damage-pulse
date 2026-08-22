window.__ModuleLoader__.load({
	id: "dsh-damage-pulse",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region packages/client/ui-token-monitor/src/client/usage-node.ts
		function locationOf(context) {
			return context.start?.location ?? context.matches[0]?.location ?? { kind: "unresolved" };
		}
		const tokenUsageNodeDefinition = {
			kind: "token-usage",
			target: "chat",
			match: (event) => {
				if (event.type === "token-usage/record") return {
					id: String(event.seq),
					role: "start"
				};
				return null;
			},
			start: (_context, match) => {
				if (match.event.type !== "token-usage/record") throw new Error("token-usage requires token-usage/record");
				return match.event.data.record;
			},
			update: (context) => context.state,
			publication: () => "immediate",
			buildViewNode: (context) => {
				if (context.state === void 0) return null;
				return {
					key: context.key,
					kind: "token-usage",
					id: context.id,
					target: "chat",
					anchorSeq: context.start?.event.seq ?? context.matches[0]?.event.seq ?? 0,
					location: locationOf(context),
					visibility: "visible",
					data: context.state
				};
			}
		};
		//#endregion
		//#region packages/client/ui-token-monitor/src/client/UsageNodeView.tsx
		/**
		* 单次用量行 renderer：对话流内紧凑展示一次模型调用的 token 与金额。
		* 无 locale（文案硬编码中文），无 CSS module（内联样式，M4 验证用）。
		*/
		const ROW = {
			display: "inline-flex",
			alignItems: "baseline",
			gap: 8,
			padding: "3px 10px",
			fontSize: 12,
			lineHeight: "18px",
			color: "var(--dsh-color-text-secondary, #888)",
			fontVariantNumeric: "tabular-nums"
		};
		const COST$1 = {
			fontWeight: 600,
			color: "var(--dsh-color-accent, #4c8dff)"
		};
		/** 把大 token 数格式化为 1.2k / 3.4M 的紧凑形式。 */
		function fmtTokens$1(n) {
			if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
			if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
			return String(n);
		}
		/** 金额格式：保留足够小数位，极小值也用科学计数兜底。 */
		function fmtCost$2(n) {
			if (n === 0) return "¥0";
			if (n < 1e-4) return `¥${n.toExponential(2)}`;
			if (n < .01) return `¥${n.toFixed(5)}`;
			return `¥${n.toFixed(4)}`;
		}
		const UsageNodeView = (0, react.memo)(function UsageNodeView({ node }) {
			const r = node.data;
			const total = r.inputTokens + r.cacheReadTokens + r.cacheWriteTokens + r.outputTokens;
			const cache = r.cacheReadTokens > 0 ? ` · 缓存 ${fmtTokens$1(r.cacheReadTokens)}` : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: ROW,
				"data-token-usage": "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: r.model }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						"↑ ",
						fmtTokens$1(r.inputTokens + r.cacheWriteTokens),
						cache
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["↓ ", fmtTokens$1(r.outputTokens)] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						"∑ ",
						fmtTokens$1(total),
						" tok"
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: r.peak ? "峰时" : "谷时" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: COST$1,
						children: fmtCost$2(r.cost)
					})
				]
			});
		});
		//#endregion
		//#region packages/client/ui-token-monitor/src/client/SessionStatsBar.tsx
		const BAR = {
			display: "inline-flex",
			alignItems: "baseline",
			gap: 10,
			fontSize: 12,
			lineHeight: "16px",
			color: "var(--dsh-color-text-secondary, #888)",
			fontVariantNumeric: "tabular-nums"
		};
		const COST = {
			fontWeight: 600,
			color: "var(--dsh-color-accent, #4c8dff)"
		};
		function fmtTokens(n) {
			if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
			if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
			return String(n);
		}
		function fmtCost$1(n) {
			if (n === 0) return "¥0";
			if (n < 1e-4) return `¥${n.toExponential(2)}`;
			if (n < .01) return `¥${n.toFixed(5)}`;
			return `¥${n.toFixed(4)}`;
		}
		function SessionStatsBar({ useProjection }) {
			const projection = useProjection("tokenCost");
			if (projection === void 0 || projection === null) return null;
			const p = projection;
			if (p.calls === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: BAR,
				"data-token-monitor-stats": "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "本次会话" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: COST,
						children: fmtCost$1(p.cost)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [fmtTokens(p.totalTokens), " tokens"] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [p.calls, " 次调用"] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["↑ ", fmtTokens(p.inputTokens + p.cacheWriteTokens)] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["↓ ", fmtTokens(p.outputTokens)] })
				]
			});
		}
		//#endregion
		//#region packages/client/ui-token-monitor/src/client/WhaleGirlStage.tsx
		const ASSET_ROOT = "/assets/dsh-token-monitor/whale-girl";
		const IDLE_ROOT = `${ASSET_ROOT}/idle-v4-r2`;
		const FEEDBACK_EXPRESSION_ROOT = `${ASSET_ROOT}/feedback-expression-v4-r4-model/frames`;
		const CRITICAL_EXPRESSION_ROOT = `${ASSET_ROOT}/feedback-expression-v4-r5-critical-model/frames`;
		const BASE_IDLE_ASSET = `${IDLE_ROOT}/idle-08.png`;
		const REVIVE_ROOT = `${ASSET_ROOT}/revive-recharge-v1/frames`;
		const SIZE = 512;
		const IDLE_ASSETS = {
			...Object.fromEntries(Array.from({ length: 8 }, (_, index) => {
				const name = `idle-${String(index + 1).padStart(2, "0")}`;
				return [name, `${IDLE_ROOT}/${name}.png`];
			})),
			...Object.fromEntries(Array.from({ length: 8 }, (_, index) => {
				const name = `acting-${String(index + 1).padStart(2, "0")}`;
				return [name, `${IDLE_ROOT}/${name}.png`];
			})),
			"blink-half-close": `${IDLE_ROOT}/blink-half-close.png`,
			"blink-soft": `${IDLE_ROOT}/blink-soft.png`,
			"blink-reopen": `${IDLE_ROOT}/blink-reopen.png`
		};
		const FEEDBACK_EXPRESSION_ASSETS = Object.fromEntries([
			"weak",
			"normal",
			"critical"
		].flatMap((level) => [
			"half",
			"close",
			"reopen"
		].map((phase) => {
			const name = `${level}-${phase}`;
			return [name, `${FEEDBACK_EXPRESSION_ROOT}/${name}.png`];
		})));
		const CRITICAL_EXPRESSION_ASSETS = Object.fromEntries([
			"notice",
			"brace",
			"peak",
			"overflow",
			"comfort",
			"recover"
		].map((phase) => [`critical-r5-${phase}`, `${CRITICAL_EXPRESSION_ROOT}/critical-${phase}.png`]));
		const REVIVE_ASSETS = Object.fromEntries([
			"death-start",
			"wake",
			"lift",
			"relief",
			"hop",
			"settle",
			"reopen"
		].map((name) => [`revive-${name}`, `${REVIVE_ROOT}/revive-${name}.png`]));
		const ACTION_DURATIONS = {
			blink: 760,
			peek: 2850,
			tilt: 3100,
			tail: 4600,
			nibble: 4800
		};
		const clamp$1 = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
		const smoother = (value) => {
			const x = clamp$1(value);
			return x * x * x * (x * (x * 6 - 15) + 10);
		};
		const wave = (progress, cycles = 1, phase = 0) => Math.sin((progress * cycles + phase) * Math.PI * 2);
		const pulse = (progress, start, end) => Math.sin(Math.PI * clamp$1((progress - start) / (end - start)));
		const envelope = (progress, start = .08, end = .9) => {
			if (progress <= start) return smoother(progress / start);
			if (progress >= end) return 1 - smoother((progress - end) / (1 - end));
			return 1;
		};
		function idleMotion(now, epoch, strength) {
			const t = (now - epoch) / 1e3;
			return {
				x: (.34 * wave(t, .13) + .16 * wave(t, .31, .2)) * strength,
				y: (-.7 + .62 * wave(t, .245) + .14 * wave(t, .61, .35)) * strength,
				angle: (.18 * wave(t, .17) + .08 * wave(t, .43, .4)) * strength,
				sx: 1 + .0013 * wave(t, .245, .5) * strength,
				sy: 1 + .0018 * wave(t, .245) * strength
			};
		}
		function loadImage(url) {
			return new Promise((resolve, reject) => {
				const image = new Image();
				image.onload = async () => {
					try {
						await image.decode();
					} catch {}
					resolve(image);
				};
				image.onerror = () => reject(/* @__PURE__ */ new Error(`Failed to load whale-girl asset: ${url}`));
				image.src = url;
			});
		}
		/**
		* 鲸鱼娘固定 512px 单画布舞台。待机和旧反馈姿态均先在离屏画布完成，再一次提交可见帧。
		* @param props 当前由既有余额事件状态机选择的反馈姿态。
		* @returns 宽度由父容器固定为余额卡 80% 的透明 Canvas。
		*/
		const isPainPose = (pose) => ![
			"idle",
			"heal-happy",
			"revive-recharge"
		].includes(pose);
		function WhaleGirlStage({ pose, impactPulse = 0, onPoseComplete, syncEpoch }) {
			const canvasRef = (0, react.useRef)(null);
			const poseRef = (0, react.useRef)(pose);
			const impactPulseRef = (0, react.useRef)(impactPulse);
			const onPoseCompleteRef = (0, react.useRef)(onPoseComplete);
			(0, react.useEffect)(() => {
				poseRef.current = pose;
			}, [pose]);
			(0, react.useEffect)(() => {
				impactPulseRef.current = impactPulse;
			}, [impactPulse]);
			(0, react.useEffect)(() => {
				onPoseCompleteRef.current = onPoseComplete;
			}, [onPoseComplete]);
			(0, react.useEffect)(() => {
				const canvas = canvasRef.current;
				if (canvas === null) return;
				const context = canvas.getContext("2d", { alpha: true });
				if (context === null) return;
				const buffer = document.createElement("canvas");
				buffer.width = SIZE;
				buffer.height = SIZE;
				const bufferContext = buffer.getContext("2d", { alpha: true });
				if (bufferContext === null) return;
				context.imageSmoothingEnabled = true;
				context.imageSmoothingQuality = "high";
				bufferContext.imageSmoothingEnabled = true;
				bufferContext.imageSmoothingQuality = "high";
				let disposed = false;
				let frame = 0;
				let idleEpoch = syncEpoch ?? performance.now();
				let action = null;
				let actionStartedAt = 0;
				let nextActionAt = idleEpoch + (syncEpoch === void 0 ? 2500 + Math.random() * 2500 : 900);
				let lastAction = null;
				let showcaseActionIndex = 0;
				let lastPose = poseRef.current;
				let feedbackStartedAt = idleEpoch;
				let lastImpactPulse = impactPulseRef.current;
				let lastImpactAt = idleEpoch;
				let reviveCompleted = false;
				let reviveReady = false;
				let reviveWaitingForAssets = poseRef.current === "revive-recharge";
				let tiltSide = 1;
				const images = /* @__PURE__ */ new Map();
				const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
				const draw = (image, motion = {}, yOffset = 0) => {
					if (image === void 0) return;
					const x = motion.x ?? 0;
					const y = motion.y ?? 0;
					const angle = motion.angle ?? 0;
					const sx = motion.sx ?? 1;
					const sy = motion.sy ?? 1;
					bufferContext.save();
					bufferContext.translate(256 + x, 470 + y);
					bufferContext.rotate(angle * Math.PI / 180);
					bufferContext.scale(sx, sy);
					bufferContext.drawImage(image, -256, -470 + yOffset, SIZE, SIZE);
					bufferContext.restore();
				};
				const present = () => {
					context.save();
					context.globalCompositeOperation = "copy";
					context.drawImage(buffer, 0, 0);
					context.restore();
				};
				const begin = () => bufferContext.clearRect(0, 0, SIZE, SIZE);
				const get = (name) => images.get(name);
				const poseKey = (progress, keys) => keys[Math.min(keys.length - 1, Math.floor(clamp$1(progress) * keys.length))];
				const renderIdle = (now) => {
					const motion = idleMotion(now, idleEpoch, reducedMotion.matches ? .18 : 1);
					motion.x = clamp$1(motion.x, -.45, .45);
					motion.angle = clamp$1(motion.angle, -.16, .16);
					draw(get("idle-08"), motion);
				};
				const renderAction = (name, progress, now) => {
					if (name === "blink") {
						const key = poseKey(progress, [
							"idle",
							"half-close",
							"soft",
							"soft",
							"reopen",
							"half-close",
							"idle"
						]);
						const motion = idleMotion(now, idleEpoch, .18);
						motion.x = clamp$1(motion.x, -.35, .35);
						motion.angle = clamp$1(motion.angle, -.12, .12);
						draw(get(key === "idle" ? "idle-08" : `blink-${key}`), motion);
						return;
					}
					if (name === "peek") {
						const phase = progress < .16 ? 5 : progress < .4 ? 6 : progress < .72 ? 7 : 8;
						const q = envelope(progress, .11, .86);
						const motion = idleMotion(now, idleEpoch, .35);
						motion.x += -3.2 * pulse(progress, 0, .14) + 7.2 * q + .9 * wave(progress, 1.65) * q * (1 - progress);
						motion.y += 6.4 * q + 1.1 * wave(progress, 2.3) * q;
						motion.angle += 2.4 * q + .8 * wave(progress) * q;
						draw(get(`acting-${String(phase).padStart(2, "0")}`), motion);
						return;
					}
					if (name === "tilt") {
						const q = envelope(progress, .16, .82);
						const settle = 1.1 * wave(progress, 2.2) * q * (1 - progress);
						const motion = idleMotion(now, idleEpoch, .35);
						motion.x += tiltSide * (7.8 * q + 1.2 * settle);
						motion.y += 4.8 * q;
						motion.angle += tiltSide * (6.8 * q + settle);
						draw(get(q > .48 ? tiltSide > 0 ? "idle-04" : "idle-03" : "idle-08"), motion);
						return;
					}
					if (name === "tail") {
						const q = envelope(progress, .12, .88);
						const sway = wave(progress, 1.5);
						const motion = idleMotion(now, idleEpoch, .25);
						motion.x += clamp$1(-5.4 * sway * q, -5.4, 3.6);
						motion.y -= 5 * q;
						motion.angle += (-2.35 * sway + .65 * wave(progress, 3, .18) * q * (1 - progress)) * q;
						draw(get("idle-08"), motion);
						return;
					}
					const phase = progress < .18 ? 1 : progress < .38 ? 2 : progress < .68 ? 3 : progress < .88 ? 2 : 4;
					const q = envelope(progress, .1, .91);
					const motion = idleMotion(now, idleEpoch, .3);
					motion.x += -4.8 * q + 1.3 * wave(progress, 1.4) * q;
					motion.y += 7.2 * q + (phase === 3 ? 1.1 * wave(progress, 5.5) : 0);
					motion.angle += -2.2 * q + .7 * wave(progress, 1.2) * q * (1 - progress);
					draw(get(`acting-${String(phase).padStart(2, "0")}`), motion);
				};
				const drawImpactMark = (x, y, size, alpha) => {
					bufferContext.save();
					bufferContext.translate(x, y);
					bufferContext.globalAlpha = clamp$1(alpha);
					bufferContext.strokeStyle = "#ff758c";
					bufferContext.lineWidth = 4;
					bufferContext.lineCap = "round";
					for (let index = 0; index < 3; index += 1) {
						bufferContext.rotate(-Math.PI / 3);
						bufferContext.beginPath();
						bufferContext.moveTo(0, -size * .35);
						bufferContext.lineTo(0, -size);
						bufferContext.stroke();
					}
					bufferContext.restore();
				};
				/**
				* 反馈始终使用 V4 同身份的完整单源帧。眼睛、嘴、腮红和泪滴全部来自
				* Sota gpt-image-2 素材；运行时只画一张完整人物图，不程序绘制或叠加面部。
				* 脸区以外像素和透明轮廓逐像素继承 idle-v4-r2 母版。
				*/
				const renderFeedback = (currentPose, now) => {
					const elapsed = Math.max(0, now - feedbackStartedAt);
					const sinceImpact = Math.max(0, now - lastImpactAt);
					const progress = clamp$1(elapsed / 1250);
					const impactProgress = clamp$1(sinceImpact / 1250);
					const release = Math.max(envelope(progress, .08, .78), envelope(impactProgress, .08, .78));
					const motion = idleMotion(now, idleEpoch, .08);
					const feedbackFrame = (pain = true) => {
						if (elapsed < 80) return get("idle-08");
						if (!pain) {
							if (elapsed < 155) return get("blink-half-close");
							if (elapsed < 980) return get("blink-soft");
							if (elapsed < 1060) return get("blink-half-close");
							if (elapsed < 1145) return get("blink-reopen");
							return get("idle-08");
						}
						const criticalFrame = () => {
							if (elapsed < 165) return get("critical-r5-notice");
							if (elapsed < 300) return get("critical-r5-brace");
							if (elapsed < 500 || sinceImpact < 430) return get("critical-r5-peak");
							if (elapsed < 720 || sinceImpact < 650) return get("critical-r5-overflow");
							if (sinceImpact < 940) return get("critical-r5-comfort");
							if (sinceImpact < 1155) return get("critical-r5-recover");
							return get("idle-08");
						};
						if (currentPose === "critical-pain" || currentPose === "critical-combo") return criticalFrame();
						const level = currentPose === "weak-pain" ? "weak" : "normal";
						if (elapsed < 165) return get(`${level}-half`);
						if (elapsed < 650 || sinceImpact < 650) return get(`${level}-close`);
						if (sinceImpact < 900) return get(`${level}-half`);
						if (sinceImpact < 990) return get(`${level}-close`);
						if (sinceImpact < 1080) return get(`${level}-half`);
						if (sinceImpact < 1155) return get(`${level}-reopen`);
						return get("idle-08");
					};
					if (currentPose === "heal-happy") {
						motion.y -= 7.2 * pulse(progress, 0, .58);
						motion.x += 1.1 * wave(progress, 1.5) * release;
						motion.angle += 1.25 * wave(progress, 1.5) * release;
						draw(feedbackFrame(false), motion);
						bufferContext.save();
						bufferContext.globalAlpha = .72 * release;
						bufferContext.fillStyle = "#72e6b1";
						bufferContext.font = "700 25px system-ui, sans-serif";
						bufferContext.fillText("+", 155, 345 - 9 * progress);
						bufferContext.fillText("✦", 349, 316 - 12 * progress);
						bufferContext.restore();
						return;
					}
					const strength = currentPose === "weak-pain" ? .5 : currentPose === "normal-pain" ? .76 : 1;
					const hit = Math.max(Math.exp(-elapsed / 150), Math.exp(-sinceImpact / 150) * .65);
					const tremble = Math.sin(elapsed * .105) * hit * strength;
					motion.x += (-7.5 * hit + 2.2 * tremble) * strength;
					motion.y += (2.4 * hit + 3.8 * pulse(progress, 0, .55)) * strength;
					motion.angle += (-1.7 * hit + .55 * tremble) * strength;
					if (currentPose === "critical-combo") {
						const comboRelease = Math.max(0, 1 - progress * 1.15);
						motion.x += Math.sin(elapsed * .16) * comboRelease * 3.4;
						motion.angle += Math.sin(elapsed * .11) * comboRelease * .7;
					}
					draw(feedbackFrame(), motion);
					drawImpactMark(346, 294, 16 + 5 * strength, release * strength);
				};
				/**
				* 复苏使用六张图片模型生成的完整人物关键姿势。任意可见帧只绘制
				* 一张完整人物图；姿势停留区间仅施加刚体位移/旋转/缩放和缓动。
				*/
				const renderRevive = (now) => {
					if (!reviveReady) {
						draw(get("revive-death-start") ?? get("idle-08"));
						return;
					}
					const elapsed = Math.max(0, now - feedbackStartedAt);
					let key = "revive-death-start";
					const motion = {
						x: 0,
						y: 0,
						angle: 0,
						sx: 1,
						sy: 1
					};
					if (elapsed < 220) motion.y = 1.5 * smoother(elapsed / 220);
					else if (elapsed < 720) {
						key = "revive-wake";
						const p = (elapsed - 220) / 500;
						motion.y = 3 - 3 * smoother(p);
						motion.angle = -.8 * pulse(p, 0, .62);
					} else if (elapsed < 1250) {
						key = "revive-lift";
						const p = (elapsed - 720) / 530;
						motion.y = 4 - 6 * smoother(p);
						motion.angle = .65 * pulse(p, 0, .72);
					} else if (elapsed < 1900) {
						key = "revive-relief";
						const p = (elapsed - 1250) / 650;
						motion.y = -2 - 1.2 * wave(p, .72);
						motion.angle = .35 * wave(p, .7);
					} else if (elapsed < 2400) {
						key = "revive-hop";
						const p = (elapsed - 1900) / 500;
						motion.y = -3 - 15 * Math.sin(Math.PI * p);
						motion.angle = -.7 * Math.sin(Math.PI * p);
						motion.sx = 1 - .008 * Math.sin(Math.PI * p);
						motion.sy = 1 + .008 * Math.sin(Math.PI * p);
					} else if (elapsed < 2850) {
						key = "revive-settle";
						const p = (elapsed - 2400) / 450;
						const settle = Math.sin(p * Math.PI * 2.4) * (1 - p);
						motion.y = 3.6 * settle;
						motion.sx = 1 + .006 * Math.max(0, settle);
						motion.sy = 1 - .006 * Math.max(0, settle);
					} else {
						key = "revive-reopen";
						const p = clamp$1((elapsed - 2850) / 500);
						motion.y = -.8 * Math.sin(Math.PI * p);
					}
					draw(get(key), motion);
					if (elapsed >= 3350 && !reviveCompleted) {
						reviveCompleted = true;
						queueMicrotask(() => onPoseCompleteRef.current?.("revive-recharge"));
					}
				};
				const chooseAction = () => {
					if (reducedMotion.matches) return "blink";
					if (syncEpoch !== void 0) {
						const sequence = [
							"blink",
							"tail",
							"tilt",
							"peek",
							"nibble"
						];
						const selected = sequence[showcaseActionIndex % sequence.length];
						showcaseActionIndex += 1;
						return selected;
					}
					const choices = [
						"peek",
						"tilt",
						"tail",
						"nibble",
						"blink",
						"tail",
						"tilt",
						"nibble"
					].filter((candidate) => candidate !== lastAction);
					return choices[Math.floor(Math.random() * choices.length)];
				};
				const tick = (now) => {
					const currentPose = poseRef.current;
					const currentImpactPulse = impactPulseRef.current;
					if (currentImpactPulse !== lastImpactPulse) {
						lastImpactPulse = currentImpactPulse;
						lastImpactAt = now;
					}
					if (currentPose !== lastPose) {
						action = null;
						idleEpoch = now;
						if (isPainPose(currentPose) !== isPainPose(lastPose) || currentPose === "heal-happy" || lastPose === "heal-happy" || currentPose === "revive-recharge" || lastPose === "revive-recharge") feedbackStartedAt = now;
						if (currentPose === "revive-recharge") {
							reviveCompleted = false;
							reviveWaitingForAssets = !reviveReady;
						}
						nextActionAt = now + (syncEpoch === void 0 ? 2200 + Math.random() * 2800 : 700);
						lastPose = currentPose;
					}
					if (currentPose === "revive-recharge" && reviveWaitingForAssets && reviveReady) {
						feedbackStartedAt = now;
						reviveWaitingForAssets = false;
					}
					begin();
					if (currentPose === "revive-recharge") renderRevive(now);
					else if (currentPose !== "idle") renderFeedback(currentPose, now);
					else if (action !== null) {
						const progress = clamp$1((now - actionStartedAt) / ACTION_DURATIONS[action]);
						renderAction(action, progress, now);
						if (progress >= 1) {
							lastAction = action;
							action = null;
							idleEpoch = now - 700;
							nextActionAt = now + (syncEpoch === void 0 ? 1800 + Math.random() * 4200 : 700);
						}
					} else {
						renderIdle(now);
						if (now >= nextActionAt) {
							action = chooseAction();
							if (action === "tilt") tiltSide *= -1;
							actionStartedAt = now;
						}
					}
					present();
					if (!disposed) frame = requestAnimationFrame(tick);
				};
				const baseUrl = BASE_IDLE_ASSET;
				const reviveDeathUrl = REVIVE_ASSETS["revive-death-start"];
				const reviveMotionUrls = Object.values(REVIVE_ASSETS).filter((url) => url !== reviveDeathUrl);
				const backgroundUrls = [
					...Object.values(IDLE_ASSETS),
					...Object.values(FEEDBACK_EXPRESSION_ASSETS),
					...Object.values(CRITICAL_EXPRESSION_ASSETS)
				].filter((url) => url !== baseUrl);
				loadImage(baseUrl).then((baseImage) => {
					if (disposed) return;
					images.set(baseUrl, baseImage);
					images.set("idle-08", baseImage);
					frame = requestAnimationFrame(tick);
					return loadImage(reviveDeathUrl);
				}).then((deathImage) => {
					if (disposed || deathImage === void 0) return;
					images.set(reviveDeathUrl, deathImage);
					images.set("revive-death-start", deathImage);
					return Promise.all(reviveMotionUrls.map(async (url) => [url, await loadImage(url)]));
				}).then((reviveLoaded) => {
					if (disposed || reviveLoaded === void 0) return;
					for (const [url, image] of reviveLoaded) images.set(url, image);
					for (const [name, url] of Object.entries(REVIVE_ASSETS)) images.set(name, images.get(url));
					reviveReady = true;
					return Promise.all(backgroundUrls.map(async (url) => [url, await loadImage(url)]));
				}).then((loaded) => {
					if (disposed || loaded === void 0) return;
					for (const [url, image] of loaded) images.set(url, image);
					for (const [name, url] of Object.entries(IDLE_ASSETS)) images.set(name, images.get(url));
					for (const [name, url] of Object.entries(FEEDBACK_EXPRESSION_ASSETS)) images.set(name, images.get(url));
					for (const [name, url] of Object.entries(CRITICAL_EXPRESSION_ASSETS)) images.set(name, images.get(url));
				}).catch((error) => {
					if (!disposed) console.error(error);
				});
				return () => {
					disposed = true;
					cancelAnimationFrame(frame);
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				width: SIZE,
				height: SIZE,
				style: {
					display: "block",
					width: "100%",
					height: "100%"
				}
			});
		}
		//#endregion
		//#region packages/client/ui-token-monitor/src/client/BalanceWidget.tsx
		/**
		* 余额悬浮卡片：挂载在 frame 级浮动层（shell.overlay，右下角）。
		*
		* 数据源两个：
		* - 扣费：每秒增量拉取 /api/token-monitor/charge-events（Host collector 每次模型调用算出的精确 cost），
		*   按 seq 逐事件排队 → 每条独立飘字 + 余额逐条扣减 + 可打断的连续回弹 + 鲸鱼娘持续受击。
		* - 余额：每 60 秒拉取 /api/token-monitor/balance，校准显示余额；检测到余额变多（充值）→
		*   绿色「加费」飘字动画 + 数字绿色闪烁。
		*
		* 全局（root scope）组件，无 session 依赖。
		*/
		const CARD = {
			position: "fixed",
			padding: "6px 12px",
			borderRadius: 8,
			background: "var(--dsh-color-surface-overlay, rgba(30, 30, 30, 0.82))",
			color: "var(--dsh-color-text, #e8e8e8)",
			fontSize: 16,
			lineHeight: "22px",
			fontVariantNumeric: "tabular-nums",
			pointerEvents: "auto",
			cursor: "grab",
			userSelect: "none",
			boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
			zIndex: 1e3
		};
		const RED = "#ff3b30";
		const GREEN = "#30a46c";
		const DEATH_ASSET = `/assets/dsh-token-monitor/whale-girl/death-stranded-v6-trim.png`;
		/** 附件参考节奏：扣费文字以最终字号快速显现，平稳上飘后渐隐。 */
		const KEYFRAMES = `
@keyframes tkm-impact-float {
  0%   { opacity: 0; transform: translate3d(0, 5px, 0); }
  8%   { opacity: 1; transform: translate3d(0, 0, 0); }
  64%  { opacity: 1; transform: translate3d(0, -32px, 0); }
  82%  { opacity: .76; transform: translate3d(0, -43px, 0); }
  100% { opacity: 0; transform: translate3d(0, -56px, 0); }
}
@keyframes tkm-impact-float-reduced {
  0%   { opacity: 0; transform: translate3d(0, 6px, 0); }
  35%  { opacity: 1; transform: translate3d(0, -6px, 0); }
  100% { opacity: 0; transform: translate3d(0, -30px, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .tkm-impact-float {
    animation: tkm-impact-float-reduced 180ms ease-out forwards !important;
  }
}
`;
		/** 单条扣费文字；定位由鲸鱼娘头顶的独立反馈层负责。 */
		const FLOAT = {
			position: "absolute",
			left: "50%",
			bottom: 0,
			fontFamily: "Inter, \"Segoe UI\", \"Microsoft YaHei\", sans-serif",
			fontSize: 18,
			fontWeight: 700,
			lineHeight: 1,
			fontVariantNumeric: "tabular-nums",
			pointerEvents: "none",
			zIndex: 1001,
			animation: "tkm-impact-float 1250ms cubic-bezier(.2,.72,.3,1) forwards",
			transformOrigin: "50% 100%",
			translate: "-50% 0",
			whiteSpace: "nowrap",
			willChange: "transform, opacity",
			textShadow: "0 1px 3px rgba(0,0,0,0.5)"
		};
		/** 悬浮窗位置持久化 key。 */
		const POS_KEY = "dsh-token-monitor-balance-pos";
		const WHALE_VISIBLE_KEY = "dsh-token-monitor-show-whale-girl";
		/** 从 localStorage 恢复上次位置；缺失或非法则用右下角默认值。 */
		function loadPos() {
			try {
				const raw = localStorage.getItem(POS_KEY);
				if (raw !== null) {
					const parsed = JSON.parse(raw);
					if (typeof parsed.left === "number" && typeof parsed.top === "number") return {
						left: parsed.left,
						top: parsed.top
					};
				}
			} catch {}
			return {
				left: Math.max(0, window.innerWidth - 220),
				top: Math.max(0, window.innerHeight - 72)
			};
		}
		/** 持久化悬浮窗位置。 */
		function savePos(pos) {
			try {
				localStorage.setItem(POS_KEY, JSON.stringify(pos));
			} catch {}
		}
		/** 恢复鲸鱼娘显示偏好；首次使用默认显示。 */
		function loadWhaleVisible() {
			try {
				const raw = localStorage.getItem(WHALE_VISIBLE_KEY);
				if (raw === null) return true;
				const parsed = JSON.parse(raw);
				return typeof parsed === "boolean" ? parsed : true;
			} catch {
				return true;
			}
		}
		/** 限制数值在 [min, max] 区间。 */
		function clamp(value, min, max) {
			return Math.min(Math.max(value, min), max);
		}
		/** 紧凑金额格式：小金额保留 4 位，大金额保留 2 位。 */
		function fmtCost(cost) {
			return cost < .01 ? cost.toFixed(4) : cost.toFixed(2);
		}
		/** 高峰时段（北京时间，半开区间 [start, end)）。 */
		const PEAK_HOURS = [[9, 12], [14, 18]];
		/** 取时间戳对应的北京时间小时（0-23）；解析失败返回 -1。 */
		function beijingHour(ts) {
			const hour = new Intl.DateTimeFormat("en-GB", {
				timeZone: "Asia/Shanghai",
				hour: "2-digit",
				hour12: false
			}).formatToParts(new Date(ts)).find((p) => p.type === "hour")?.value;
			return hour === void 0 ? -1 : Number(hour);
		}
		/** 当前时刻是否落在高峰时段。 */
		function isPeakNow() {
			const hour = beijingHour(Date.now());
			return PEAK_HOURS.some(([start, end]) => hour >= start && hour < end);
		}
		const CHARGE_POLL_MS = 1e3;
		const BALANCE_POLL_MS = 6e4;
		const FLOAT_MS = 1250;
		const FLOAT_EMIT_INTERVAL_MS = 450;
		const FLASH_MS = 620;
		const WHALE_POSE_MS = 1250;
		const DRAG_THRESHOLD_PX = 4;
		function BalanceWidget({ previewOverride }) {
			const [balanceInfo, setBalanceInfo] = (0, react.useState)(void 0);
			const [display, setDisplay] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(false);
			const [flash, setFlash] = (0, react.useState)(null);
			const [anims, setAnims] = (0, react.useState)([]);
			const [whalePose, setWhalePose] = (0, react.useState)("idle");
			const [whaleImpactPulse, setWhaleImpactPulse] = (0, react.useState)(0);
			const [reviving, setReviving] = (0, react.useState)(false);
			const [showWhaleGirl, setShowWhaleGirl] = (0, react.useState)(loadWhaleVisible);
			const [contextMenu, setContextMenu] = (0, react.useState)(null);
			const [pos, setPos] = (0, react.useState)(() => previewOverride?.fixedPosition ?? loadPos());
			const [dragging, setDragging] = (0, react.useState)(false);
			const [isPeak, setIsPeak] = (0, react.useState)(() => previewOverride?.forcedPeak ?? isPeakNow());
			const chargeSeq = (0, react.useRef)(0);
			const chargeSeeded = (0, react.useRef)(false);
			const animId = (0, react.useRef)(0);
			const flashTimer = (0, react.useRef)(void 0);
			const animTimers = (0, react.useRef)(/* @__PURE__ */ new Set());
			const animQueue = (0, react.useRef)([]);
			const queuedDebit = (0, react.useRef)(0);
			const queueTimer = (0, react.useRef)(void 0);
			const whalePoseTimer = (0, react.useRef)(void 0);
			const lastCriticalAt = (0, react.useRef)(0);
			const activeWhaleSeverity = (0, react.useRef)(0);
			const lastBalanceSnapshot = (0, react.useRef)(null);
			const revivingRef = (0, react.useRef)(false);
			const showWhaleGirlRef = (0, react.useRef)(showWhaleGirl);
			const balanceValueRef = (0, react.useRef)(null);
			const cardRef = (0, react.useRef)(null);
			const dragStart = (0, react.useRef)(null);
			const contextMenuRef = (0, react.useRef)(null);
			/** 右键打开余额显示设置菜单，并限制菜单不超出视口。 */
			const onContextMenu = (0, react.useCallback)((event) => {
				event.preventDefault();
				dragStart.current = null;
				setDragging(false);
				setContextMenu({
					left: clamp(event.clientX, 4, Math.max(4, window.innerWidth - 176 - 4)),
					top: clamp(event.clientY, 4, Math.max(4, window.innerHeight - 72 - 4))
				});
			}, []);
			/** 支持 Context Menu 键和 Shift+F10 打开设置。 */
			const onKeyDown = (0, react.useCallback)((event) => {
				if (event.key === "Escape") {
					setContextMenu(null);
					return;
				}
				if (event.key === "ContextMenu" || event.key === "F10" && event.shiftKey) {
					event.preventDefault();
					const rect = event.currentTarget.getBoundingClientRect();
					setContextMenu({
						left: clamp(rect.left, 4, Math.max(4, window.innerWidth - 180)),
						top: clamp(rect.bottom + 4, 4, Math.max(4, window.innerHeight - 76))
					});
				}
			}, []);
			const toggleWhaleGirl = (0, react.useCallback)(() => {
				setShowWhaleGirl((visible) => {
					const next = !visible;
					try {
						localStorage.setItem(WHALE_VISIBLE_KEY, JSON.stringify(next));
					} catch {}
					return next;
				});
				setContextMenu(null);
			}, []);
			(0, react.useEffect)(() => {
				if (contextMenu === null) return;
				const close = (event) => {
					if (contextMenuRef.current?.contains(event.target)) return;
					setContextMenu(null);
				};
				const onBlur = () => setContextMenu(null);
				document.addEventListener("pointerdown", close);
				window.addEventListener("blur", onBlur);
				return () => {
					document.removeEventListener("pointerdown", close);
					window.removeEventListener("blur", onBlur);
				};
			}, [contextMenu]);
			(0, react.useEffect)(() => {
				showWhaleGirlRef.current = showWhaleGirl;
				if (showWhaleGirl) {
					setWhalePose("idle");
					return;
				}
				if (whalePoseTimer.current !== void 0) clearTimeout(whalePoseTimer.current);
				whalePoseTimer.current = void 0;
				setWhalePose("idle");
				revivingRef.current = false;
				setReviving(false);
			}, [showWhaleGirl]);
			/** 卡片完整约束在视口内；窗口缩放后也会修正并保存位置。 */
			const constrainPos = (0, react.useCallback)((next) => {
				const rect = cardRef.current?.getBoundingClientRect();
				const width = rect?.width ?? 180;
				const height = rect?.height ?? 34;
				return {
					left: clamp(next.left, 0, Math.max(0, window.innerWidth - width)),
					top: clamp(next.top, 0, Math.max(0, window.innerHeight - height))
				};
			}, []);
			(0, react.useEffect)(() => {
				const onResize = () => setPos((current) => {
					const next = constrainPos(current);
					savePos(next);
					return next;
				});
				window.addEventListener("resize", onResize);
				onResize();
				return () => window.removeEventListener("resize", onResize);
			}, [constrainPos]);
			/** 拖拽开始：记录起点，捕获指针。 */
			const onPointerDown = (0, react.useCallback)((event) => {
				if (previewOverride !== void 0) return;
				if (event.button !== 0) return;
				if (event.target.closest("[role=menu]") !== null) return;
				dragStart.current = {
					x: event.clientX,
					y: event.clientY,
					left: pos.left,
					top: pos.top,
					pointerId: event.pointerId,
					moved: false
				};
				event.currentTarget.setPointerCapture(event.pointerId);
			}, [pos, previewOverride]);
			/** 拖拽移动：按位移更新位置，并限制在视口内。 */
			const onPointerMove = (0, react.useCallback)((event) => {
				const start = dragStart.current;
				if (start === null) return;
				const dx = event.clientX - start.x;
				const dy = event.clientY - start.y;
				if (!start.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
				if (!start.moved) {
					start.moved = true;
					setDragging(true);
					setContextMenu(null);
				}
				setPos(constrainPos({
					left: start.left + dx,
					top: start.top + dy
				}));
			}, [constrainPos]);
			/** 拖拽结束：持久化位置。 */
			const onPointerUp = (0, react.useCallback)((event) => {
				if (dragStart.current === null) return;
				dragStart.current = null;
				setDragging(false);
				if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
				setPos((current) => {
					savePos(current);
					return current;
				});
			}, []);
			/** 余额节点保留同一 DOM；连续扣费从当前视觉状态接续，不再靠 key 强制重播。 */
			const pulseBalance = (0, react.useCallback)((kind) => {
				const node = balanceValueRef.current;
				if (node === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
				for (const animation of node.getAnimations()) {
					try {
						animation.commitStyles();
					} catch {}
					animation.cancel();
				}
				const strong = kind === "miss";
				node.animate([
					{ transform: getComputedStyle(node).transform === "none" ? "translate3d(0,0,0) scale(1)" : getComputedStyle(node).transform },
					{
						transform: strong ? "translate3d(-2px,3px,0) scale(.955)" : "translate3d(0,2px,0) scale(.978)",
						offset: .22
					},
					{
						transform: strong ? "translate3d(2px,-1px,0) scale(1.025)" : "translate3d(0,-1px,0) scale(1.012)",
						offset: .55
					},
					{ transform: "translate3d(0,0,0) scale(1)" }
				], {
					duration: strong ? 620 : 440,
					easing: "cubic-bezier(.2,.86,.25,1)",
					fill: "forwards"
				});
			}, []);
			/** 将一条反馈真正发射到共同轨道。 */
			const emit = (0, react.useCallback)((pending) => {
				const { eventId, seq, text, color, kind, label, debit, suppressWhaleReaction = false } = pending;
				const id = ++animId.current;
				const next = {
					eventId,
					seq,
					text,
					color,
					damageKind: kind,
					...label === void 0 ? {} : { label }
				};
				setAnims((list) => [...list, {
					id,
					...next
				}].slice(-64));
				if (debit !== void 0 && debit > 0) {
					queuedDebit.current = Math.max(0, queuedDebit.current - debit);
					setDisplay((previous) => previous === null ? null : Math.max(0, previous - debit));
				}
				if (color === "red" && revivingRef.current) {
					revivingRef.current = false;
					setReviving(false);
				}
				if (showWhaleGirlRef.current && !suppressWhaleReaction) {
					const now = Date.now();
					const severity = color === "green" ? 0 : kind === "output" ? 1 : kind === "normal" ? 2 : 3;
					activeWhaleSeverity.current = Math.max(activeWhaleSeverity.current, severity);
					const pose = color === "green" ? "heal-happy" : activeWhaleSeverity.current === 1 ? "weak-pain" : activeWhaleSeverity.current === 2 ? "normal-pain" : now - lastCriticalAt.current < 900 ? "critical-combo" : "critical-pain";
					if (kind === "miss") lastCriticalAt.current = now;
					setWhalePose(pose);
					setWhaleImpactPulse((pulse) => pulse + 1);
					if (whalePoseTimer.current !== void 0) clearTimeout(whalePoseTimer.current);
					whalePoseTimer.current = setTimeout(() => {
						whalePoseTimer.current = void 0;
						activeWhaleSeverity.current = 0;
						setWhalePose("idle");
					}, WHALE_POSE_MS);
				}
				setFlash(color);
				pulseBalance(kind);
				if (flashTimer.current !== void 0) clearTimeout(flashTimer.current);
				flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
				const timer = setTimeout(() => {
					animTimers.current.delete(timer);
					setAnims((list) => list.filter((anim) => anim.id !== id));
				}, FLOAT_MS);
				animTimers.current.add(timer);
			}, [pulseBalance]);
			/** FIFO 发射器：首条立即出现，后续按指定 GIF 的约 450ms 节奏发射。 */
			const drainQueue = (0, react.useCallback)(function drain() {
				const next = animQueue.current.shift();
				if (next === void 0) {
					queueTimer.current = void 0;
					return;
				}
				emit(next);
				queueTimer.current = setTimeout(drain, FLOAT_EMIT_INTERVAL_MS);
			}, [emit]);
			/** 将反馈加入共同轨道队列，连续触发时保持可辨识的部分覆盖。 */
			const trigger = (0, react.useCallback)((eventId, text, color, kind = "normal", label, seq, debit, suppressWhaleReaction = false) => {
				if (debit !== void 0 && debit > 0) queuedDebit.current += debit;
				animQueue.current.push({
					eventId,
					seq,
					text,
					color,
					kind,
					label,
					debit,
					suppressWhaleReaction
				});
				if (queueTimer.current === void 0 && animQueue.current.length === 1) drainQueue();
			}, [drainQueue]);
			(0, react.useEffect)(() => () => {
				if (flashTimer.current !== void 0) clearTimeout(flashTimer.current);
				if (queueTimer.current !== void 0) clearTimeout(queueTimer.current);
				animTimers.current.forEach((timer) => clearTimeout(timer));
				animTimers.current.clear();
				animQueue.current = [];
				queuedDebit.current = 0;
				if (whalePoseTimer.current !== void 0) clearTimeout(whalePoseTimer.current);
			}, []);
			const cancelDrag = (0, react.useCallback)(() => {
				if (dragStart.current === null) return;
				dragStart.current = null;
				setDragging(false);
				setPos((current) => {
					const next = constrainPos(current);
					savePos(next);
					return next;
				});
			}, [constrainPos]);
			(0, react.useEffect)(() => {
				if (!dragging) return;
				const finish = () => cancelDrag();
				window.addEventListener("pointerup", finish);
				window.addEventListener("pointercancel", finish);
				window.addEventListener("blur", finish);
				return () => {
					window.removeEventListener("pointerup", finish);
					window.removeEventListener("pointercancel", finish);
					window.removeEventListener("blur", finish);
				};
			}, [cancelDrag, dragging]);
			(0, react.useEffect)(() => {
				if (previewOverride !== void 0) {
					setIsPeak(previewOverride.forcedPeak);
					setPos(previewOverride.fixedPosition);
					return;
				}
				const update = () => setIsPeak(isPeakNow());
				const timer = setInterval(update, 3e4);
				return () => clearInterval(timer);
			}, [previewOverride]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				const poll = async () => {
					try {
						const res = await fetch(`/api/token-monitor/charge-events?since=${chargeSeq.current}`, { cache: "no-store" });
						if (!res.ok) return;
						const data = await res.json();
						if (!chargeSeeded.current) {
							chargeSeeded.current = true;
							chargeSeq.current = data.seq;
							return;
						}
						const events = [...data.events ?? []].filter((event) => Number.isFinite(event.seq) && event.seq > chargeSeq.current).sort((left, right) => left.seq - right.seq);
						if (events.length === 0) return;
						if (cancelled) return;
						for (const event of events) {
							const eventId = event.id ?? `charge-${event.seq}`;
							const topKind = event.kind;
							const parts = [];
							if (topKind !== void 0) parts.push({
								suffix: topKind,
								cost: event.cost,
								kind: topKind === "miss" ? "miss" : topKind === "output" ? "output" : "normal",
								label: topKind === "miss" ? "未命中" : topKind === "output" ? "输出" : "命中"
							});
							else {
								const hit = Number(event.breakdown?.cacheHit?.cost ?? 0);
								const output = Number(event.breakdown?.output?.cost ?? 0);
								const miss = Number(event.breakdown?.cacheMiss?.cost ?? 0);
								if ([
									hit,
									output,
									miss
								].every((cost) => Number.isFinite(cost) && cost >= 0) && hit + output + miss > 0) {
									if (hit > 0) parts.push({
										suffix: "hit",
										cost: hit,
										kind: "normal",
										label: "命中"
									});
									if (output > 0) parts.push({
										suffix: "output",
										cost: output,
										kind: "output",
										label: "输出"
									});
									if (miss > 0) parts.push({
										suffix: "miss",
										cost: miss,
										kind: "miss",
										label: "未命中"
									});
								} else {
									const fallbackKind = event.damageKind === "miss" ? "miss" : "normal";
									parts.push({
										suffix: "legacy",
										cost: event.cost,
										kind: fallbackKind,
										label: fallbackKind === "miss" ? "未命中" : "命中"
									});
								}
							}
							for (const part of parts) {
								if (!Number.isFinite(part.cost) || part.cost <= 0) continue;
								trigger(`${eventId}-${part.suffix}`, `-${fmtCost(part.cost)}¥`, "red", part.kind, part.label, event.seq, part.cost);
							}
							chargeSeq.current = Math.max(chargeSeq.current, event.seq);
						}
					} catch {}
				};
				poll();
				const timer = setInterval(() => void poll(), CHARGE_POLL_MS);
				return () => {
					cancelled = true;
					clearInterval(timer);
				};
			}, [trigger]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				const poll = async () => {
					try {
						const res = await fetch("/api/token-monitor/balance", { cache: "no-store" });
						if (!res.ok) {
							if (!cancelled) setError(true);
							return;
						}
						const data = await res.json();
						if (cancelled) return;
						setBalanceInfo(data);
						setError(false);
						if (data !== null) {
							const previousSnapshot = lastBalanceSnapshot.current;
							const grew = previousSnapshot !== null && data.totalBalance > previousSnapshot + 1e-9;
							const crossedFromDepleted = previousSnapshot !== null && previousSnapshot <= 0 && data.totalBalance > 0;
							if (grew) trigger(`heal-${Date.now()}`, `+${fmtCost(data.totalBalance - previousSnapshot)}¥`, "green", "normal", void 0, void 0, void 0, crossedFromDepleted);
							lastBalanceSnapshot.current = data.totalBalance;
							setDisplay(data.totalBalance + queuedDebit.current);
							if (crossedFromDepleted && showWhaleGirlRef.current) {
								if (whalePoseTimer.current !== void 0) clearTimeout(whalePoseTimer.current);
								whalePoseTimer.current = void 0;
								activeWhaleSeverity.current = 0;
								revivingRef.current = true;
								setReviving(true);
								setWhalePose("revive-recharge");
							} else if (data.totalBalance <= 0) {
								if (whalePoseTimer.current !== void 0) clearTimeout(whalePoseTimer.current);
								whalePoseTimer.current = void 0;
								revivingRef.current = false;
								setReviving(false);
								setWhalePose("idle");
							}
						}
					} catch {
						if (!cancelled) setError(true);
					}
				};
				poll();
				const timer = setInterval(() => void poll(), BALANCE_POLL_MS);
				return () => {
					cancelled = true;
					clearInterval(timer);
				};
			}, [trigger]);
			if (balanceInfo === void 0) return null;
			if (balanceInfo === null || error) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: CARD,
				"data-token-monitor-balance": "",
				children: "余额：未配置 API Key 或查询失败"
			});
			const amountColor = flash === "red" ? RED : flash === "green" ? GREEN : "var(--dsh-color-accent, #4c8dff)";
			const shown = display ?? balanceInfo.totalBalance;
			const depleted = shown <= 0;
			const onWhalePoseComplete = (completedPose) => {
				if (completedPose !== "revive-recharge" || !revivingRef.current) return;
				revivingRef.current = false;
				setReviving(false);
				setWhalePose("idle");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: cardRef,
				style: {
					...CARD,
					left: pos.left,
					top: pos.top,
					cursor: previewOverride === void 0 ? dragging ? "grabbing" : "grab" : "default"
				},
				"data-token-monitor-balance": "",
				"data-showcase-instance": previewOverride?.instanceId,
				"data-showcase-peak": isPeak ? "peak" : "valley",
				title: "DeepSeek 账户余额（扣费实时、余额 60s 校准；可拖动）",
				tabIndex: 0,
				onContextMenu,
				onKeyDown,
				onPointerDown,
				onPointerMove,
				onPointerUp,
				onPointerCancel: cancelDrag,
				onLostPointerCapture: cancelDrag,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: KEYFRAMES }),
					contextMenu !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: contextMenuRef,
						role: "menu",
						"aria-label": "余额显示设置",
						onPointerDown: (event) => event.stopPropagation(),
						onKeyDown: (event) => {
							if (event.key === "Escape") {
								event.stopPropagation();
								setContextMenu(null);
							}
						},
						style: {
							position: "fixed",
							left: contextMenu.left,
							top: contextMenu.top,
							minWidth: 176,
							padding: 6,
							borderRadius: 6,
							background: "var(--dsh-color-surface-overlay, rgba(28, 28, 28, 0.96))",
							color: "var(--dsh-color-text, #e8e8e8)",
							boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
							border: "1px solid rgba(255,255,255,0.12)",
							zIndex: 1100
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								padding: "2px 8px 5px",
								fontSize: 11,
								opacity: .65
							},
							children: "余额显示设置"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							role: "menuitemcheckbox",
							"aria-checked": showWhaleGirl,
							onClick: toggleWhaleGirl,
							style: {
								display: "flex",
								alignItems: "center",
								gap: 8,
								width: "100%",
								padding: "6px 8px",
								border: 0,
								borderRadius: 4,
								background: "transparent",
								color: "inherit",
								textAlign: "left",
								cursor: "pointer",
								font: "inherit"
							},
							onMouseEnter: (event) => {
								event.currentTarget.style.background = "rgba(255,255,255,0.10)";
							},
							onMouseLeave: (event) => {
								event.currentTarget.style.background = "transparent";
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: {
									width: 14,
									textAlign: "center",
									color: "#79b8ff"
								},
								children: showWhaleGirl ? "✓" : ""
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "显示鲸鱼娘" })]
						})]
					}),
					showWhaleGirl && depleted && !reviving && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"aria-hidden": "true",
						"data-token-monitor-whale-depleted": "",
						style: {
							position: "absolute",
							left: "10%",
							bottom: "calc(100% - 8px)",
							width: "80%",
							aspectRatio: "1351 / 691",
							zIndex: 2,
							pointerEvents: "none",
							overflow: "visible"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							src: DEATH_ASSET,
							alt: "",
							style: {
								position: "absolute",
								inset: 0,
								width: "100%",
								height: "100%",
								objectFit: "contain",
								objectPosition: "bottom center",
								display: "block"
							}
						})
					}),
					showWhaleGirl && (reviving || !depleted) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"aria-hidden": "true",
						style: {
							position: "absolute",
							left: "10%",
							bottom: "calc(100% - 8px)",
							width: "80%",
							aspectRatio: "1 / 1",
							zIndex: 2,
							pointerEvents: "none",
							overflow: "visible"
						},
						"data-token-monitor-whale-layer": "",
						"data-token-monitor-whale-pose": whalePose,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WhaleGirlStage, {
							pose: whalePose,
							impactPulse: whaleImpactPulse,
							onPoseComplete: onWhalePoseComplete,
							syncEpoch: previewOverride?.syncEpoch
						})
					}),
					anims.length > 0 && !depleted && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"aria-hidden": "true",
						"data-token-monitor-damage-layer": "head-front",
						style: {
							position: "absolute",
							left: "50%",
							bottom: showWhaleGirl ? "calc(100% + 42px)" : "calc(100% + 8px)",
							width: 0,
							height: 0,
							zIndex: 12,
							pointerEvents: "none",
							overflow: "visible"
						},
						children: anims.map((anim) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "tkm-impact-float",
							"data-charge-event-id": anim.eventId,
							"data-charge-seq": anim.seq,
							"data-charge-kind": anim.damageKind,
							style: {
								...FLOAT,
								color: anim.color,
								display: "flex",
								alignItems: "baseline",
								justifyContent: "center",
								gap: anim.damageKind === "miss" ? 5 : 4,
								fontSize: anim.damageKind === "miss" ? 23 : FLOAT.fontSize,
								fontWeight: anim.damageKind === "miss" ? 800 : FLOAT.fontWeight,
								animation: FLOAT.animation,
								textShadow: anim.damageKind === "miss" ? "0 1px 3px rgba(0,0,0,0.76), 0 0 7px rgba(255,59,48,0.42)" : FLOAT.textShadow
							},
							children: [anim.label !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									color: RED,
									fontSize: 11,
									fontWeight: 800
								},
								children: anim.label
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: anim.text })]
						}, anim.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							position: "relative",
							zIndex: 4
						},
						children: [
							"余额",
							" ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									position: "relative",
									display: "inline-block"
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									ref: balanceValueRef,
									style: {
										fontWeight: 700,
										fontVariantNumeric: "tabular-nums",
										display: "inline-block",
										color: amountColor,
										transition: "color 0.25s ease",
										transform: "translate3d(0,0,0) scale(1)",
										willChange: "transform"
									},
									children: [
										balanceInfo.currency,
										" ",
										shown.toFixed(2)
									]
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontWeight: 700,
									marginLeft: 6,
									color: isPeak ? RED : GREEN,
									textShadow: isPeak ? "0 0 6px rgba(255,59,48,0.9), 0 0 14px rgba(255,59,48,0.55)" : "0 0 6px rgba(48,164,108,0.9), 0 0 14px rgba(48,164,108,0.55)",
									transition: "color 0.3s ease, text-shadow 0.3s ease"
								},
								children: isPeak ? "峰" : "谷"
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region packages/client/ui-token-monitor/src/client/index.ts
		/** 依赖：slot 注册 + Conversation Node 事件装配。 */
		const inject = ["slots", "conversationEvents"];
		function apply(ctx) {
			ctx.conversationEvents.register(tokenUsageNodeDefinition);
			ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
				name: "conversation.chat.node",
				key: "token-usage"
			}, UsageNodeView));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "token-monitor-stats",
				order: 0
			}, SessionStatsBar));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "token-monitor-balance"
			}, BalanceWidget));
		}
		//#endregion
		exports.BalanceWidget = BalanceWidget;
		exports.SessionStatsBar = SessionStatsBar;
		exports.UsageNodeView = UsageNodeView;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map