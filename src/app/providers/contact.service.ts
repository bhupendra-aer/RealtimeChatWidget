import { Injectable } from '@angular/core';
import * as firebase from 'firebase/app';
import {Observable} from 'rxjs/observable';
import { Http, Headers, RequestOptions } from '@angular/http';
// models
import { ContactModel } from '../../models/contact';
import { IChatUserModel } from '../../models/ChatUser';

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/Observable/throw';

@Injectable()
export class ContactService {

  listContacts: ContactModel[];
  tenant: string;
  conversationId: string;
  urlNodeFirebaseContact: string;
  urlNodeFirebaseGroup: string;
  userId: string;
  serverBaseUrl: string="https://apiv2.socialworks.in/api/chat/LoadMyChatUsers?user_id=";
  //serverBaseUrl: string="https://api.standupindia.in/api/chat/LoadMyChatUsers?user_id=";
  constructor(private _http: Http) { }

  initialize(userId, tenant, conversationId) {
    this.listContacts = [];
    const that = this;
    this.tenant = tenant;
    this.conversationId = conversationId;
    this.userId = userId;
    // recupero elenco partecipanti alla chat
    this.urlNodeFirebaseGroup = '/apps/' + this.tenant + '/users/' + this.userId + '/groups/' + this.conversationId + '/members';
    console.log('urlNodeFirebaseGroup *****', this.urlNodeFirebaseGroup);
    const firebaseGroup = firebase.database().ref(this.urlNodeFirebaseGroup)
    .once('value').then(function(snapshot) {
      console.log('snapshot.val() *****', snapshot);
      that.getProfileUser(snapshot);
    });
  }

  getProfileUser(snapshot) {
    const that = this;
    snapshot.forEach(
      function(childSnapshot) {
        console.log('arrayUser *****', childSnapshot.key);
        that.urlNodeFirebaseContact = '/apps/' + that.tenant + '/contacts/' + childSnapshot.key;
        const firebaseContact = firebase.database().ref(that.urlNodeFirebaseContact)
        .once('value').then(function(snapshotContact) {
          console.log('contact.val() *****', snapshotContact.val());
          if (snapshotContact.val()) {
            const contact: ContactModel = snapshotContact.val();
            that.listContacts.push(contact);
          }
        });
      }
    );
    console.log('listContacts *****', this.listContacts);
  }

  getContactList(userId): Observable<IChatUserModel[]> {
    const url = this.serverBaseUrl + userId;
    const TOKEN = 'Basic OTk3MTk1MzQyMjpUZWFtdzByaw==';
    console.log('Chat users URL', url, TOKEN);
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', TOKEN);
    return this._http
      .get(url, { headers })
      .map((response) => 
            <IChatUserModel[]>response.json()              
          )
      .catch(this.handleError);
  }

  handleError(error: Response) {
    console.error(error);
    return Observable.throw(error);
  } 

  getContactProfile(uid): ContactModel {
    const profiloContatto =  this.listContacts.filter(function(handler) {
      return handler.uid === uid;
    });
    return profiloContatto[0];
  }

}
