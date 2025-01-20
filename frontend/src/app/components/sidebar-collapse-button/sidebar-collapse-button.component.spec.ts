import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarCollapseButtonComponent } from './sidebar-collapse-button.component';

describe('SidebarCollapseButtonComponent', () => {
  let component: SidebarCollapseButtonComponent;
  let fixture: ComponentFixture<SidebarCollapseButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarCollapseButtonComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SidebarCollapseButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
