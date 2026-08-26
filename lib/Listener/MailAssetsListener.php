<?php

declare(strict_types=1);

namespace OCA\MailPopout\Listener;

use OCA\MailPopout\AppInfo\Application;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\IRequest;
use OCP\Util;

/** @implements IEventListener<BeforeTemplateRenderedEvent> */
final class MailAssetsListener implements IEventListener {
	public function __construct(
		private readonly IRequest $request,
	) {
	}

	public function handle(Event $event): void {
		if (!$event instanceof BeforeTemplateRenderedEvent || !$this->isMailRequest()) {
			return;
		}

		Util::addStyle(Application::APP_ID, 'mail-popout');
		Util::addScript(Application::APP_ID, 'mail-popout');
	}

	private function isMailRequest(): bool {
		$path = '/' . ltrim($this->request->getPathInfo(), '/');

		return preg_match('#/(?:index\.php/)?apps/mail(?:/|$)#', $path) === 1;
	}
}
