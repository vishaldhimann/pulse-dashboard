import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;
  private newEvents$ = new Subject<any>();
  private newErrors$ = new Subject<any>();
  private newAlerts$ = new Subject<any>();
  private heartbeat$ = new Subject<any>();

  constructor() {
    const origin = environment.apiBaseUrl.replace(/\/$/, '');
    this.socket = io(origin, { withCredentials: true });

    this.socket.on('new-events', (data) => this.newEvents$.next(data));
    this.socket.on('new-errors', (data) => this.newErrors$.next(data));
    this.socket.on('new-alerts', (data) => this.newAlerts$.next(data));
    this.socket.on('heartbeat', (data) => this.heartbeat$.next(data));
  }

  onNewEvents(): Observable<any> { return this.newEvents$.asObservable(); }
  onNewErrors(): Observable<any> { return this.newErrors$.asObservable(); }
  onNewAlerts(): Observable<any> { return this.newAlerts$.asObservable(); }
  onHeartbeat(): Observable<any> { return this.heartbeat$.asObservable(); }
}
