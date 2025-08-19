import { Injectable } from '@angular/core';
import { LoginResponse } from '../models/LoginResponse.dto';

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  constructor() {
    //
  }

  getLoginResponse(): LoginResponse {
    //
  }
}
