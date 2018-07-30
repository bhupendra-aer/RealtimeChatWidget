import { Component, OnInit } from '@angular/core';
import {AuthService} from '../../core/auth.service';
import {MessagingService} from '../../providers/messaging.service';
import {ContactService} from '../../providers/contact.service';
import {IChatUserModel} from '../../../models/ChatUser';
import {AppComponent} from '../../app.component';

@Component({
  selector: 'app-chatbox',
  templateUrl:'./chatbox.component.html',
  styleUrls: ['./chatbox.component.less']
})

export class ChatboxComponent implements OnInit {
   
  //contactList: any[];
    userImageUrl:string='https://apiv2.socialworks.in/api/upload/GetUserImage?userid=';
 // userImageUrl:string='http://api.standupindia.in/api/upload/GetUserImage?userid=';
   
    contactList: IChatUserModel[];
    userId:string=sessionStorage.getItem('userId');
    conversationWith:string;
    statusMessage: string = 'Loading data. Please wait...';
    constructor(
      public authService: AuthService,
      public messagingService: MessagingService,
      public contactService: ContactService)
       { 
         console.log(' ---- COSTRUCTOR ------- ');
       }
      
       ngOnInit() {
            this.contactService.getContactList(this.userId)
            .subscribe(
            chatUsers => this.contactList = chatUsers,
            error => {
                this.statusMessage =
                    'Problem with the service. Please try again after sometime';
            });
        }
        chat_open()
        {
          localStorage.setItem('conversationWith',this.userId);
          
        }
  }
  
  
