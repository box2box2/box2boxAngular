import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, Renderer2, OnInit } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class HeaderComponent implements OnInit {
  @Input() headerColor: string | null = null;

  constructor(private renderer: Renderer2) {}

  ngOnInit(): void {
    const saved = localStorage.getItem('theme');
    // Default to dark theme unless the user explicitly chose light
    if (saved === 'light') {
      this.renderer.removeClass(document.body, 'dark-theme');
    } else {
      this.renderer.addClass(document.body, 'dark-theme');
      if (!saved) {
        localStorage.setItem('theme', 'dark');
      }
    }
  }

  toggleTheme(): void {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }
}
