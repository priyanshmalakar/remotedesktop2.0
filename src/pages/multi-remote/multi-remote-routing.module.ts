import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MultiRemotePage } from './multi-remote.page';

const routes: Routes = [
    {
        path: '',
        component: MultiRemotePage
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class MultiRemotePageRoutingModule {}