import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-watchlist',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './watchlist.html',
    styleUrls: ['./watchlist.css'],
})
export class WatchlistComponent {
    constructor() {}
}
