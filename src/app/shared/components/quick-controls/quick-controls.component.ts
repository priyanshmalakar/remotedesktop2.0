import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-quick-controls',
  templateUrl: './quick-controls.component.html',
  styleUrls: ['./quick-controls.component.scss']
})
export class QuickControlsComponent {
  @Input() localStream: MediaStream | null = null;
  @Output() toggleCamera = new EventEmitter<void>();
  @Output() toggleMic = new EventEmitter<void>();
  @Output() endCall = new EventEmitter<void>();

  isMuted = false;
  videoOn = true;

  onToggleMic() {
    this.isMuted = !this.isMuted;
    this.toggleMic.emit();
  }

  onToggleCamera() {
    this.videoOn = !this.videoOn;
    this.toggleCamera.emit();
  }

  onEndCall() {
    this.endCall.emit();
  }
}