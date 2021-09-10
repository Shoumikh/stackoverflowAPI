import { HttpClient } from '@angular/common/http';
import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, SortDirection } from '@angular/material/sort';
import { merge, Observable, of as observableOf } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';

/**
 * @title Table retrieving data through HTTP
 */
@Component({
  selector: 'TW-table',
  styleUrls: ['table.component.scss'],
  templateUrl: 'table.component.html',
})
export class TableComponent implements AfterViewInit {
  displayedColumns: string[] = ['title', 'view_count', 'score', 'link'];
  exampleDatabase: ExampleHttpDatabase | null;
  data: GithubIssue[] = [];

  resultsLength = 0;
  isLoadingResults = true;
  isRateLimitReached = false;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  filteredData: any;

  constructor(private _httpClient: HttpClient) {}

  ngAfterViewInit() {
    this.exampleDatabase = new ExampleHttpDatabase(this._httpClient);

    // If the user changes the sort order, reset back to the first page.
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.exampleDatabase!.getRepoIssues(
            this.sort.active,
            this.sort.direction,
            this.paginator.pageIndex
          ).pipe(catchError(() => observableOf(null)));
        }),
        map((data) => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.isRateLimitReached = data === null;

          if (data === null) {
            return [];
          }

          // Only refresh the result length if there is new data. In case of rate
          // limit errors, we do not want to reset the paginator to zero, as that
          // would prevent users from re-triggering requests.
          this.resultsLength = data.quota_max;
          return data.items;
        })
      )
      .subscribe((data) => (this.data = data));
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
  }
}

export interface GithubApi {
  items: GithubIssue[];
  quota_max: number;
}

export interface GithubIssue {
  link: string;
  score: string;
  view_count: string;
  title: string;
}

/** An example database that the data source uses to retrieve data for the table. */
export class ExampleHttpDatabase {
  constructor(private _httpClient: HttpClient) {}

  getRepoIssues(
    sort: string,
    order: SortDirection,
    page: number
  ): Observable<GithubApi> {
    // const href = 'https://api.github.com/search/issues';
    const href = 'https://api.stackexchange.com/2.2/questions';

    const requestUrl = `${href}?site=stackoverflow&order=${order}&sort=${sort}&filter=default&pagesize=10&page=${
      page + 1
    }`;
    // const requestUrl = `${href}?q=repo:angular/components&sort=${sort}&order=${order}&page=${
    //   page + 1
    // }`;

    return this._httpClient.get<GithubApi>(requestUrl);
  }
}
