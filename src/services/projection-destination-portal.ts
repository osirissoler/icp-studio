import type { Router } from 'vue-router';
import { watch } from 'vue';
import { useProjectionWorkspaceStore } from '../stores/projection-workspace-store';

const calendarRoute = '/calendario';
const knownHeaderSelectors: Record<string, string> = {
  '/ruleta': '.header-actions',
  '/reloj-tiempo': '.header-actions',
  '/metronomo': '.metronome-header-actions',
  '/actividades/imagen-escondida': '.page-header',
};

const liveActionLabels = [
  'enviar a en vivo',
  'enviar en vivo',
  'comenzar en vivo',
  'actualizar en vivo',
  'control en vivo',
];

function hasLiveAction(element: HTMLElement): boolean {
  const text = (element.textContent ?? '').toLocaleLowerCase('es');
  return liveActionLabels.some((label) => text.includes(label));
}

function findPresentableTarget(path: string): HTMLElement | null {
  if (path === calendarRoute) return null;

  const knownSelector = knownHeaderSelectors[path];
  if (knownSelector) {
    const knownTarget = document.querySelector<HTMLElement>(knownSelector);
    if (knownTarget) return knownTarget;
  }

  const candidates = document.querySelectorAll<HTMLElement>(
    '.header-actions, .metronome-header-actions, .page-header',
  );

  return [...candidates].find(hasLiveAction) ?? null;
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
    const signature = workspaceStore.outputs
      .map((output) => `${output.outputId}:${output.name}`)
      .join('|');
    if (select.dataset.signature !== signature) {
      select.replaceChildren();
      for (const output of workspaceStore.outputs) {
        const option = document.createElement('option');
        option.value = output.outputId;
        option.textContent = output.name;
        select.append(option);
      }
      select.dataset.signature = signature;
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

    if (workspaceStore.outputs.length === 0) {
      removePortal();
      return;
    }

    const path = router.currentRoute.value.path;
    const nextTarget = findPresentableTarget(path);
    if (!nextTarget) {
      removePortal();
      return;
    }

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

  observer = new MutationObserver(() => {
    const undecoratedMonitor = document.querySelector('.monitor-header:not([data-tool-header="true"])');
    const nextTarget = findPresentableTarget(router.currentRoute.value.path);
    const needsPortal =
      workspaceStore.outputs.length > 0 &&
      Boolean(nextTarget) &&
      (!portal?.isConnected || !target?.isConnected || target !== nextTarget);
    if (undecoratedMonitor || needsPortal) queueRender();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  queueRender();

  return () => {
    removeAfterEach();
    stopOutputsWatch();
    observer?.disconnect();
    removePortal();
  };
}
