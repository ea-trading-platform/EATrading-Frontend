import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface TopBarNavItem {
  label: string;
  route: string;
}

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-top-bar',
  styleUrl: './top-bar.css',
  templateUrl: './top-bar.html',
})
export class TopBar {
  navItems = input<readonly TopBarNavItem[]>([]);
  logout = output<void>();
}
