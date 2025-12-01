import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MultiRemotePageRoutingModule } from './multi-remote-routing.module';
import { MultiRemotePage } from './multi-remote.page';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        MultiRemotePageRoutingModule
    ],
    declarations: [MultiRemotePage]
})
export class MultiRemotePageModule {}