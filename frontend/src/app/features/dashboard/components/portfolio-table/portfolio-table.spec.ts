import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioTableComponent } from './portfolio-table';

describe('PortfolioTableComponent', () => {
    let component: PortfolioTableComponent;
    let fixture: ComponentFixture<PortfolioTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PortfolioTableComponent],
        })
            .overrideComponent(PortfolioTableComponent, { set: { template: '' } })
            .compileComponents();

        fixture = TestBed.createComponent(PortfolioTableComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
