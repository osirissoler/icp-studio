import type { Router } from 'vue-router';
import { watch } from 'vue';
import { useProjectionWorkspaceStore } from '../stores/projection-workspace-store';

const supportedRoutes = new Set([
  '/ruleta',
  '/reloj-tiempo',
  '/metronomo',
  '/actividades/imagen-escondida',
]);

function headerSelector(path: string): string | null {
  if (path === '/metronomo') return '.metronome-header-actions';
  if (path === '/actividades/imagen-escondida') return '.page-header';
  if (path === '/ruleta' || path === '/reloj-tiempo') return '.header-actions';
  return null;
}

export function installProjectionDestinationPortal(router: Router): () => void {
  const workspaceStore = useProjectionWorkspaceStore();
  let portal: HTMLDivElement | null = null;
  let select: HTMLSelectElement | null = null;
  let target: HTMLElement | null = null;
  let observer: MutationObserver | null = null;
  let renderQueued = false;

  function removePortal(): void {
    portal?.remove();
    portal = null;
    select = null;
    target = null;
  }

  function selectedOutputId(): string {
    const current = workspaceStore.activeOutputId;
    if (current && workspaceStore.outputs.some((output) => output.outputId === current)) {
      return current;
    }
    return workspaceStore.outputs[0]?.outputId ?? '';
  }

  function fillOptions(): void {
    if (!select) return;
    const currentValue = selectedOutputId();
    select.replaceChildren();
    for (const output of workspaceStore.outputs) {
      const option = document.createElement('option');
      option.value = output.outputId;
      option.textContent = output.name;
      select.append(option);
    }
    select.value = currentValue;
  }

  function createPortal(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'tool-projection-destination';
    wrapper.innerHTML = `
      <span class="tool-projection-destination__label">
        <span class="material-icons tool-projection-destination__icon">desktop_windows</span>
        Destino
      </span>
      <span class="tool-projection-destination__select-wrap">
        <span class="tool-projection-destination__dot"></span>
        <select class="tool-projection-destination__select" aria-label="Destino de proyección"></select>
        <span class="material-icons tool-projection-destination__chevron">unfold_more</span>
      </span>
    `;
    select = wrapper.querySelector<HTMLSelectElement>('.tool-projection-destination__select');
    select?.addEventListener('change', () => {
      const outputId = select?.value ?? '';
      if (!outputId || outputId === workspaceStore.activeOutputId) return;
      workspaceStore.switchWorkspace(outputId);
    });
    return wrapper;
  }

  function decorateMonitorHeader(): void {
    const header = document.querySelector<HTMLElement>('.monitor-header');
    if (!header || header.dataset.toolHeader === 'true') return;
    const copy = header.querySelector<HTMLElement>(':scope > div');
    const originalClose = header.querySelector<HTMLButtonElement>(':scope > button');
    if (!copy || !originalClose) return;

    header.dataset.toolHeader = 'true';
    header.classList.add('monitor-header--tool-style');
    copy.classList.add('monitor-header__copy');

    const eyebrow = document.createElement('span');
    eyebrow.className = 'monitor-header__eyebrow';
    eyebrow.textContent = 'Proyección · Control de salidas';
    copy.prepend(eyebrow);

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'monitor-header__back';
    back.setAttribute('aria-label', 'Volver');
    back.innerHTML = '<span class="material-icons">arrow_back</span>';
    back.addEventListener('click', () => originalClose.click());

    const icon = document.createElement('span');
    icon.className = 'monitor-header__icon material-icons';
    icon.textContent = 'grid_view';

    header.prepend(icon);
    header.prepend(back);
  }

  function render(): void {
    renderQueued = false;
    decorateMonitorHeader();

    const path = router.currentRoute.value.path;
    if (!supportedRoutes.has(path) || workspaceStore.outputs.length === 0) {
      removePortal();
      return;
    }

    const selector = headerSelector(path);
    const nextTarget = selector ? document.querySelector<HTMLElement>(selector) : null;
    if (!nextTarget) return;

    if (target !== nextTarget || !portal?.isConnected) {
      removePortal();
      target = nextTarget;
      portal = createPortal();
      if (path === '/actividades/imagen-escondida') {
        portal.classList.add('tool-projection-destination--activity');
      }
      target.append(portal);
    }
    fillOptions();
  }

  function queueRender(): void {
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(render);
  }

  const removeAfterEach = router.afterEach(() => queueRender());
  const stopOutputsWatch = watch(
    () => [
      workspaceStore.activeOutputId,
      workspaceStore.outputs.map((output) => `${output.outputId}:${output.name}`).join('|'),
    ],
    () => queueRender(),
  );

  observer = new MutationObserver(() => queueRender());
  observer.observe(document.body, { childList: true, subtree: true });
  queueRender();

  return () => {
    removeAfterEach();
    stopOutputsWatch();
    observer?.disconnect();
    removePortal();
  };
}
