import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { QuickControlsComponent } from './quick-controls.component';

@NgModule({
  declarations: [QuickControlsComponent], // ✅ Declare it here
  imports: [CommonModule, IonicModule],     // ✅ Import dependencies
  exports: [QuickControlsComponent]         // ✅ Export it
})
export class QuickControlsModule {}