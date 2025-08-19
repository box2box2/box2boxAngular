import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { PrognoseDTO, PrognoseItemDTO } from '../../dtos/prognose/prognose.dto';
import { environment } from '../../../../../environments/environment';

export class PrognoseHttpService {
  constructor(protected _http: HttpClient) {}

  getPrognoses(): Observable<PrognoseDTO[]> {
    const conn = `${environment.functionAppUrl}GetPosItemPrognose`;
    return this._http.get<PrognoseDTO[]>(conn);
  }

  deletePrognose(prognoseId: string): Observable<boolean> {
    const conn = `${environment.functionAppUrl}DeletePosItemPrognose/` + prognoseId;
    return this._http.post<boolean>(conn, null);
  }

  updatePrognose(prognoseId: string, prognoseItems: PrognoseItemDTO[]): Observable<boolean> {
    const conn = `${environment.functionAppUrl}PatchPosItemPrognose`;
    const body = {
      PosItemPrognose: {
        id: prognoseId,
        Items: prognoseItems
      }
    };
    return this._http.patch<boolean>(conn, body);
  }

  createPrognose(prognose: PrognoseDTO): Observable<PrognoseDTO> {
    const conn = `${environment.functionAppUrl}CreatePosItemPrognose/new-id`;
    const headers = {
      'X-Calling-Function': 'createPosItemPrognose'
    };
    return this._http.post<PrognoseDTO>(conn, prognose, { headers }).pipe(map(prognose => prognose)) as Observable<PrognoseDTO>;
  }

  patchPrognose(prognose: PrognoseDTO): Observable<boolean> {
    const conn = `${environment.functionAppUrl}PatchPosItemPrognose`;
    const body = {
      PosItemPrognose: {
        id: prognose.id,
        Items: prognose.Items
      }
    };
    return this._http.patch<boolean>(conn, body);
  }
}
