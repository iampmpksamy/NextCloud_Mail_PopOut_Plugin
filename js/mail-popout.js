/**
 * SPDX-FileCopyrightText: 2026 pmpksamy
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

(function() {
	'use strict'

	const APP_ID = 'mail_popout'
	const COMPOSER_SELECTOR = '.floating-composer, .message-composer'
	const PORTAL_SELECTOR = '.v-popper__popper, .ck-body-wrapper, .modal-mask, .dialog-wrapper, .oc-dialog, .ui-dialog'
	const GEOMETRY_KEY = 'mail_popout.geometry.v1'
	const states = new Set()

	if (window.__mailPopoutInitialized) {
		return
	}
	window.__mailPopoutInitialized = true

	function translate(text) {
		try {
			if (window.OC?.L10N?.translate) {
				return window.OC.L10N.translate(APP_ID, text)
			}
			if (typeof window.t === 'function') {
				return window.t(APP_ID, text)
			}
		} catch (error) {
			// English source strings remain usable when no app catalogue was loaded.
		}
		return text
	}

	function isMailPage() {
		return /\/apps\/mail(?:\/|$)/.test(window.location.pathname)
	}

	function notify(message) {
		if (window.OC?.Notification?.showTemporary) {
			window.OC.Notification.showTemporary(message)
		}
	}

	function createIcon() {
		const namespace = 'http://www.w3.org/2000/svg'
		const svg = document.createElementNS(namespace, 'svg')
		svg.setAttribute('viewBox', '0 0 24 24')
		svg.setAttribute('width', '20')
		svg.setAttribute('height', '20')
		svg.setAttribute('aria-hidden', 'true')
		svg.setAttribute('focusable', 'false')

		const path = document.createElementNS(namespace, 'path')
		path.setAttribute('fill', 'currentColor')
		path.setAttribute('d', 'M14 3h7v7h-2V6.41l-8.29 8.3-1.42-1.42L17.59 5H14V3M5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z')
		svg.appendChild(path)
		return svg
	}

	function createPopoutButton(state) {
		const button = document.createElement('button')
		button.type = 'button'
		button.className = 'mail-popout-button'
		button.appendChild(createIcon())
		state.button = button
		button.addEventListener('click', function(event) {
			event.preventDefault()
			event.stopPropagation()
			if (state.popup && !state.popup.closed) {
				restoreFromBrowserWindow(state)
			} else {
				openBrowserWindow(state)
			}
		})
		setButtonState(state, false)
		return button
	}

	function setButtonState(state, poppedOut) {
		const label = poppedOut
			? translate('Return composer to Mail')
			: translate('Open composer in a separate window')
		state.button.setAttribute('aria-label', label)
		state.button.setAttribute('title', label)
		state.button.classList.toggle('mail-popout-button--return', poppedOut)
	}

	function getComposerTitle(state) {
		const title = state.shell.querySelector('.mail-popout-titlebar__title, .floating-composer__title, .modal-header__name')
		return title?.textContent?.trim() || translate('New message')
	}

	function findShell(composer) {
		const floatingComposer = composer.matches('.floating-composer')
			? composer
			: composer.closest('.floating-composer')
		if (floatingComposer) {
			return { shell: floatingComposer, legacy: false }
		}

		const modalMask = composer.closest('.modal-mask')
		if (modalMask) {
			return { shell: modalMask, legacy: true }
		}

		return null
	}

	function clearNativeFocusTrap(state) {
		const component = state.shell.__vue__
		if (component && typeof component.clearFocusTrap === 'function') {
			try {
				component.clearFocusTrap()
			} catch (error) {
				// The composer still works if a future Mail version hides this method.
			}
		}
	}

	function enhanceLegacyComposer(state) {
		const panel = state.shell.querySelector('.modal-wrapper')
		const container = state.shell.querySelector('.modal-container')
		if (!panel || !container) {
			return false
		}

		state.panel = panel
		state.shell.classList.add('mail-popout--docked')
		state.shell.setAttribute('aria-modal', 'false')
		clearNativeFocusTrap(state)
		// NcModal activates its focus trap after its opening transition. Clear it
		// once more so the Mail page remains interactive behind the floating panel.
		state.focusTrapTimer = window.setTimeout(function() {
			if (state.shell.classList.contains('mail-popout--docked')) {
				clearNativeFocusTrap(state)
			}
		}, 450)

		const titlebar = document.createElement('div')
		titlebar.className = 'mail-popout-titlebar'

		const title = document.createElement('span')
		title.className = 'mail-popout-titlebar__title'
		titlebar.appendChild(title)

		const actions = document.createElement('div')
		actions.className = 'mail-popout-titlebar__actions'
		actions.appendChild(state.button)
		titlebar.appendChild(actions)
		container.insertBefore(titlebar, container.firstChild)
		state.dragHandle = titlebar

		const nativeTitle = state.shell.querySelector('.modal-header__name')
		const updateTitle = function() {
			title.textContent = nativeTitle?.textContent?.trim() || translate('New message')
			if (state.popup && !state.popup.closed) {
				state.popup.document.title = title.textContent
			}
		}
		updateTitle()
		if (nativeTitle) {
			state.titleObserver = new MutationObserver(updateTitle)
			state.titleObserver.observe(nativeTitle, { childList: true, subtree: true, characterData: true })
		}

		return true
	}

	function enhanceFloatingComposer(state) {
		const actions = state.shell.querySelector('.floating-composer__actions')
		const header = state.shell.querySelector('.floating-composer__header')
		if (!actions || !header) {
			return false
		}

		state.panel = state.shell
		state.dragHandle = header
		state.shell.classList.add('mail-popout--docked')
		actions.insertBefore(state.button, actions.firstChild)
		return true
	}

	function loadGeometry(state) {
		let geometry
		try {
			geometry = JSON.parse(window.localStorage.getItem(GEOMETRY_KEY) || 'null')
		} catch (error) {
			return
		}
		if (!geometry
			|| !Number.isFinite(geometry.left)
			|| !Number.isFinite(geometry.top)
			|| !Number.isFinite(geometry.width)
			|| !Number.isFinite(geometry.height)) {
			return
		}

		const margin = 8
		const width = Math.max(360, Math.min(geometry.width, window.innerWidth - margin * 2))
		const height = Math.max(420, Math.min(geometry.height, window.innerHeight - margin * 2))
		const left = Math.max(margin, Math.min(geometry.left, window.innerWidth - width - margin))
		const top = Math.max(margin, Math.min(geometry.top, window.innerHeight - height - margin))

		state.panel.style.width = width + 'px'
		state.panel.style.height = height + 'px'
		state.panel.style.left = left + 'px'
		state.panel.style.top = top + 'px'
		state.panel.style.right = 'auto'
		state.panel.style.bottom = 'auto'
		state.panel.classList.add('mail-popout--positioned')
	}

	function saveGeometry(state) {
		if (!state.shell.classList.contains('mail-popout--docked') || state.shell.ownerDocument !== document) {
			return
		}
		const rect = state.panel.getBoundingClientRect()
		if (rect.width < 300 || rect.height < 300) {
			return
		}
		try {
			window.localStorage.setItem(GEOMETRY_KEY, JSON.stringify({
				left: Math.round(rect.left),
				top: Math.round(rect.top),
				width: Math.round(rect.width),
				height: Math.round(rect.height),
			}))
		} catch (error) {
			// Private browsing or a storage policy may disable localStorage.
		}
	}

	function enableResizePersistence(state) {
		if (typeof ResizeObserver !== 'function') {
			return
		}
		let timer
		state.resizeObserver = new ResizeObserver(function() {
			window.clearTimeout(timer)
			timer = window.setTimeout(function() {
				saveGeometry(state)
			}, 250)
		})
		state.resizeObserver.observe(state.panel)
	}

	function enableDragging(state) {
		state.dragHandle.addEventListener('pointerdown', function(event) {
			if (event.button !== 0
				|| !state.shell.classList.contains('mail-popout--docked')
				|| state.shell.ownerDocument !== document
				|| event.target.closest('button, a, input, textarea, select, [contenteditable="true"]')) {
				return
			}

			const rect = state.panel.getBoundingClientRect()
			const startX = event.clientX
			const startY = event.clientY
			const ownerDocument = state.panel.ownerDocument
			const oldUserSelect = ownerDocument.body.style.userSelect
			ownerDocument.body.style.userSelect = 'none'
			state.dragHandle.classList.add('mail-popout-titlebar--dragging')

			state.panel.style.width = rect.width + 'px'
			state.panel.style.height = rect.height + 'px'
			state.panel.style.left = rect.left + 'px'
			state.panel.style.top = rect.top + 'px'
			state.panel.style.right = 'auto'
			state.panel.style.bottom = 'auto'
			state.panel.classList.add('mail-popout--positioned')

			const onMove = function(moveEvent) {
				const maxLeft = Math.max(0, window.innerWidth - rect.width)
				const maxTop = Math.max(0, window.innerHeight - 48)
				const left = Math.max(0, Math.min(maxLeft, rect.left + moveEvent.clientX - startX))
				const top = Math.max(0, Math.min(maxTop, rect.top + moveEvent.clientY - startY))
				state.panel.style.left = left + 'px'
				state.panel.style.top = top + 'px'
			}

			const onUp = function() {
				ownerDocument.removeEventListener('pointermove', onMove)
				ownerDocument.removeEventListener('pointerup', onUp)
				ownerDocument.removeEventListener('pointercancel', onUp)
				ownerDocument.body.style.userSelect = oldUserSelect
				state.dragHandle.classList.remove('mail-popout-titlebar--dragging')
				saveGeometry(state)
			}

			ownerDocument.addEventListener('pointermove', onMove)
			ownerDocument.addEventListener('pointerup', onUp)
			ownerDocument.addEventListener('pointercancel', onUp)
			event.preventDefault()
		})
	}

	function copyPopupTheme(popup) {
		popup.document.documentElement.lang = document.documentElement.lang
		popup.document.documentElement.dir = document.documentElement.dir
		popup.document.documentElement.className = document.documentElement.className
		popup.document.body.className = document.body.className
		popup.document.body.classList.add('mail-popout-popup-body')

		for (const source of document.head.querySelectorAll('link[rel~="stylesheet"], style')) {
			const clone = source.cloneNode(true)
			if (source.tagName === 'LINK') {
				clone.href = source.href
			}
			popup.document.head.appendChild(clone)
		}
	}

	function createParentIndicator(state) {
		const indicator = document.createElement('div')
		indicator.className = 'mail-popout-indicator'
		indicator.setAttribute('role', 'status')

		const text = document.createElement('span')
		text.textContent = translate('Email composer is open in another window')
		indicator.appendChild(text)

		const focusButton = document.createElement('button')
		focusButton.type = 'button'
		focusButton.textContent = translate('Focus')
		focusButton.addEventListener('click', function() {
			state.popup?.focus()
		})
		indicator.appendChild(focusButton)

		const returnButton = document.createElement('button')
		returnButton.type = 'button'
		returnButton.textContent = translate('Return')
		returnButton.addEventListener('click', function() {
			restoreFromBrowserWindow(state)
		})
		indicator.appendChild(returnButton)

		document.body.appendChild(indicator)
		state.indicator = indicator
	}

	function movePortalNode(state, node) {
		if (!(node instanceof Element)
			|| node === state.shell
			|| node.contains(state.shell)
			|| state.portalNodes.has(node)
			|| node.ownerDocument !== document
			|| !state.popup
			|| state.popup.closed) {
			return
		}

		const parent = node.parentNode
		if (!parent) {
			return
		}
		const placeholder = document.createComment('mail-popout-portal-placeholder')
		parent.insertBefore(placeholder, node)
		state.portalNodes.set(node, { parent, placeholder })
		node.classList.add('mail-popout-portal')
		state.popup.document.body.appendChild(node)
	}

	function movePortalCandidates(state, root) {
		if (!(root instanceof Element)) {
			return
		}
		const candidates = []
		if (root.matches(PORTAL_SELECTOR)) {
			candidates.push(root)
		}
		for (const candidate of root.querySelectorAll(PORTAL_SELECTOR)) {
			candidates.push(candidate)
		}

		for (const candidate of candidates) {
			const hasCandidateAncestor = candidates.some(function(other) {
				return other !== candidate && other.contains(candidate)
			})
			if (!hasCandidateAncestor) {
				movePortalNode(state, candidate)
			}
		}
	}

	function routeNewPortal(root) {
		const now = Date.now()
		for (const state of states) {
			if (state.popup
				&& !state.popup.closed
				&& now - state.lastPopupInteraction < 5000) {
				movePortalCandidates(state, root)
			}
		}
	}

	function prunePortalNodes(state) {
		for (const [node, location] of state.portalNodes) {
			if (!node.isConnected) {
				location.placeholder.remove()
				state.portalNodes.delete(node)
			}
		}
	}

	function restorePortalNodes(state) {
		for (const [node, location] of state.portalNodes) {
			if (node.isConnected && location.parent.isConnected) {
				location.parent.insertBefore(node, location.placeholder)
				node.classList.remove('mail-popout-portal')
			}
			location.placeholder.remove()
		}
		state.portalNodes.clear()
	}

	function openBrowserWindow(state) {
		if (state.popup && !state.popup.closed) {
			state.popup.focus()
			return
		}

		const rect = state.panel.getBoundingClientRect()
		const width = Math.max(520, Math.min(Math.round(rect.width), window.screen.availWidth - 40))
		const height = Math.max(600, Math.min(Math.round(rect.height), window.screen.availHeight - 80))
		const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2))
		const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2))
		const popup = window.open(
			'',
			'mail-popout-' + Date.now(),
			'popup=yes,resizable=yes,scrollbars=yes,width=' + width + ',height=' + height + ',left=' + left + ',top=' + top,
		)

		if (!popup) {
			notify(translate('The browser blocked the composer window. Allow pop-ups for this Nextcloud site and try again.'))
			return
		}

		const activeElement = state.shell.contains(document.activeElement) ? document.activeElement : null
		popup.document.open()
		popup.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title></head><body></body></html>')
		popup.document.close()
		copyPopupTheme(popup)
		popup.document.title = getComposerTitle(state)

		state.popup = popup
		state.originalParent = state.shell.parentNode
		state.placeholder = document.createComment('mail-popout-placeholder')
		state.originalParent.insertBefore(state.placeholder, state.shell)
		clearNativeFocusTrap(state)
		state.shell.classList.remove('mail-popout--docked')
		state.shell.classList.add('mail-popout-window')
		if (state.legacy) {
			state.shell.setAttribute('aria-modal', 'true')
		}
		popup.document.body.appendChild(state.shell)
		setButtonState(state, true)
		createParentIndicator(state)
		// CKEditor creates one body-level host before any balloon is opened.
		// Move only that existing editor host; other portals are moved when an
		// interaction inside the detached composer creates them.
		for (const editorPortal of document.body.querySelectorAll(':scope > .ck-body-wrapper')) {
			movePortalNode(state, editorPortal)
		}

		try {
			popup.opener = null
		} catch (error) {
			// Some browsers expose opener as read-only for an about:blank popup.
		}

		const markPopupInteraction = function() {
			state.lastPopupInteraction = Date.now()
		}
		popup.addEventListener('pointerdown', markPopupInteraction, true)
		popup.addEventListener('focusin', markPopupInteraction, true)
		popup.addEventListener('keydown', function(event) {
			markPopupInteraction()
			if (event.key === 'Escape') {
				const minimize = state.shell.querySelector('.minimize-button, .floating-composer__actions button[title*="Minimize"]')
				if (minimize) {
					minimize.click()
					event.preventDefault()
				}
			}
		})
		popup.addEventListener('pagehide', function() {
			restoreFromBrowserWindow(state, true)
		}, { once: true })

		state.popupObserver = new MutationObserver(function() {
			prunePortalNodes(state)
			if (!popup.document.documentElement.contains(state.shell)) {
				finishRemovedComposer(state)
			}
		})
		state.popupObserver.observe(popup.document.body, { childList: true, subtree: true })
		state.popupTimer = window.setInterval(function() {
			if (popup.closed) {
				restoreFromBrowserWindow(state, true)
			} else if (!popup.document.documentElement.contains(state.shell)) {
				finishRemovedComposer(state)
			}
		}, 400)

		popup.focus()
		if (activeElement && typeof activeElement.focus === 'function') {
			window.setTimeout(function() {
				activeElement.focus()
			}, 0)
		}
	}

	function stopPopupMonitoring(state) {
		state.popupObserver?.disconnect()
		state.popupObserver = null
		if (state.popupTimer) {
			window.clearInterval(state.popupTimer)
			state.popupTimer = null
		}
	}

	function finishRemovedComposer(state) {
		if (state.restoring) {
			return
		}
		state.restoring = true
		stopPopupMonitoring(state)
		restorePortalNodes(state)
		state.placeholder?.remove()
		state.indicator?.remove()
		if (state.popup && !state.popup.closed) {
			state.popup.close()
		}
		state.popup = null
		window.clearTimeout(state.focusTrapTimer)
		state.restoring = false
	}

	function restoreFromBrowserWindow(state, fromPopupUnload) {
		if (state.restoring || !state.popup) {
			return
		}
		state.restoring = true
		const popup = state.popup
		stopPopupMonitoring(state)
		restorePortalNodes(state)

		const composerStillOpen = state.shell.ownerDocument === popup.document
			&& popup.document.documentElement.contains(state.shell)
			&& state.originalParent?.isConnected

		if (composerStillOpen) {
			clearNativeFocusTrap(state)
			state.originalParent.insertBefore(state.shell, state.placeholder)
			state.shell.classList.remove('mail-popout-window')
			state.shell.classList.add('mail-popout--docked')
			if (state.legacy) {
				state.shell.setAttribute('aria-modal', 'false')
			}
			setButtonState(state, false)
		}

		state.placeholder?.remove()
		state.indicator?.remove()
		state.placeholder = null
		state.indicator = null
		state.popup = null
		state.originalParent = null

		if (!fromPopupUnload && !popup.closed) {
			popup.close()
		}
		state.restoring = false
	}

	function enhanceComposer(composer) {
		const match = findShell(composer)
		if (!match || match.shell.dataset.mailPopoutEnhanced === 'true') {
			return
		}

		const state = {
			shell: match.shell,
			legacy: match.legacy,
			panel: null,
			dragHandle: null,
			button: null,
			popup: null,
			portalNodes: new Map(),
			lastPopupInteraction: 0,
			restoring: false,
		}
		state.button = createPopoutButton(state)

		const enhanced = state.legacy
			? enhanceLegacyComposer(state)
			: enhanceFloatingComposer(state)
		if (!enhanced) {
			return
		}

		state.shell.dataset.mailPopoutEnhanced = 'true'
		states.add(state)
		window.requestAnimationFrame(function() {
			loadGeometry(state)
			enableDragging(state)
			enableResizePersistence(state)
		})
	}

	function scan(root) {
		if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
			return
		}
		if (root.nodeType === Node.ELEMENT_NODE && root.matches(COMPOSER_SELECTOR)) {
			enhanceComposer(root)
		}
		for (const composer of root.querySelectorAll(COMPOSER_SELECTOR)) {
			enhanceComposer(composer)
		}
	}

	function pruneClosedComposers() {
		for (const state of states) {
			if (!state.popup && !document.documentElement.contains(state.shell)) {
				window.clearTimeout(state.focusTrapTimer)
				state.titleObserver?.disconnect()
				state.resizeObserver?.disconnect()
				states.delete(state)
			}
		}
	}

	function start() {
		if (!isMailPage() || !document.body) {
			return
		}
		scan(document)
		const observer = new MutationObserver(function(mutations) {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					scan(node)
					routeNewPortal(node)
				}
			}
			pruneClosedComposers()
		})
		observer.observe(document.body, { childList: true, subtree: true })
		document.addEventListener('pointerdown', function() {
			for (const state of states) {
				state.lastPopupInteraction = 0
			}
		}, true)

		window.addEventListener('beforeunload', function() {
			for (const state of states) {
				if (state.popup) {
					restoreFromBrowserWindow(state)
				}
			}
		})
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start, { once: true })
	} else {
		start()
	}
})()
