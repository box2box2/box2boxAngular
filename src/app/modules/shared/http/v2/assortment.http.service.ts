import { HttpClient } from '@angular/common/http';
import { catchError, combineLatest, EMPTY, first, map, Observable, of, switchMap, tap } from 'rxjs';
import { PosItemMVDTO } from '../../dtos/assortment/assortment.dto';
import { PosItemGroupDTO } from '../../dtos/assortment/itemGroup.dto';
import { PrognoseItemDTO } from '../../dtos/prognose/prognose.dto';
import { PosAssortmentItemDTO } from '../../dtos/assortment/assortmentItem.dto';
import { environment } from '../../../../../environments/environment';
import { PosV2Service } from '../../../pos/services/pos.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export class AssortmentHttpService {
  constructor(
    protected _http: HttpClient,
    private _posService: PosV2Service,
    private _snackbar: MatSnackBar
  ) {}

  validateRequiredFieldsAssortmentCall(): Observable<boolean> {
    return combineLatest([this._posService.getPosShopAccount(), this._posService.getSelectedTerminal()]).pipe(
      first(),
      map(([posShopAccount, terminal]) => {
        if (!posShopAccount || !posShopAccount.Account.id) {
          console.error('POS Shop Account is required for POS calls');
          return false;
        }
        if (!terminal || !terminal.Account.id) {
          console.error('POS Terminal is required for POS calls');
          return false;
        }
        return true;
      }),
      catchError(error => {
        console.error('Error validating POS calls:', error);
        return of(false);
      })
    );
  }

  getAssortments(): Observable<PosItemGroupDTO[]> {
    return this._posService.getPosShopAccount().pipe(
      first(),
      switchMap(shop =>
        this.validateRequiredFieldsAssortmentCall().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for getting assortment');
              this._snackbar.open('Required fields are missing for getting assortment');
              return EMPTY;
            }

            const headers = { 'X-Calling-Function': 'getAssortments' };
            const url = `${environment.functionAppUrl}GetPosItems/${shop.Account.id}`;

            return this._http.get<PosItemMVDTO[]>(url, { headers }).pipe(
              tap(response => console.log('Raw API Response:', response)),
              map((response: PosItemMVDTO[]) => {
                const itemGroups = response.flatMap(item => item.ItemGroups || []);

                const searchGroup: PosItemGroupDTO = {
                  id: 'search',
                  Name: '',
                  Items: []
                };
                itemGroups.push(searchGroup);

                const sortedGroups = itemGroups.sort((a, b) => {
                  if (a.id === 'search') return 1;
                  if (b.id === 'search') return -1;

                  const numA = parseInt(a.Name?.trim().substring(0, 2));
                  const numB = parseInt(b.Name?.trim().substring(0, 2));

                  if (isNaN(numA) && isNaN(numB)) return 0;
                  if (isNaN(numA)) return 1;
                  if (isNaN(numB)) return -1;

                  return numA - numB;
                });

                const cleanedGroups = sortedGroups.map(group => ({
                  ...group,
                  Name: group.id === 'search' ? '' : group.Name?.substring(3).trim(),
                  Items: [...(group.Items || [])].sort((a, b) => {
                    const aNum = a.Number?.toLowerCase() || '';
                    const bNum = b.Number?.toLowerCase() || '';
                    return aNum.localeCompare(bNum);
                  })
                }));

                return cleanedGroups;
              }),
              tap(itemGroups => console.log('Final ItemGroups with Search:', itemGroups))
            );
          })
        )
      )
    );
  }

  mapAssortmentsToItems(): Observable<PrognoseItemDTO[]> {
    return this._posService.getPosShopAccount().pipe(
      first(),
      switchMap(shop =>
        this.validateRequiredFieldsAssortmentCall().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for getting assortment');
              this._snackbar.open('Required fields are missing for getting assortment');
              return EMPTY;
            }

            const headers = { 'X-Calling-Function': 'getAssortments' };
            const url = `${environment.functionAppUrl}MapAssortmentToItems/${shop.Account.id}`;

            return this._http.get<PrognoseItemDTO[]>(url, { headers }).pipe();
          })
        )
      )
    );
  }

  findItemInAssortment(itemNumber: string): Observable<PosAssortmentItemDTO | undefined> {
    return this.getAssortments().pipe(
      map(assortments => {
        return assortments.flatMap(group => group.Items).find(item => item.Number === itemNumber);
      })
    );
  }
}
