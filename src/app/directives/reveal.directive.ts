import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: '[appReveal]',
  standalone: true
})
export class RevealDirective implements OnInit, OnDestroy {
  /** Position within a group; staggers the reveal. Accepts a number or index. */
  @Input('appReveal') order: number | string = 0;

  private observer?: IntersectionObserver;
  private safety?: ReturnType<typeof setTimeout>;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    const node = this.el.nativeElement;

    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || typeof IntersectionObserver === 'undefined') return;

    // From here on the element is hidden, so every path below must reveal it.
    node.classList.add('reveal');

    const step = Number(this.order);
    if (step > 0) {
      node.style.setProperty('--reveal-delay', `${Math.min(step, 6) * 70}ms`);
    }

    this.observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    this.observer.observe(node);

    
    this.safety = setTimeout(() => {
      const box = node.getBoundingClientRect();
      const inView = box.top < window.innerHeight && box.bottom > 0;
      if (inView) this.show();
    }, 2000);
  }

  private show(): void {
    this.el.nativeElement.classList.add('is-in');
    this.observer?.disconnect();
  }

  ngOnDestroy(): void {
    if (this.safety) clearTimeout(this.safety);
    this.observer?.disconnect();
  }
}
