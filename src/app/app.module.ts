//core modules
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

//external modules
import { MomentModule } from 'angular2-moment';
import { AngularFireModule } from 'angularfire2';
// import { AngularFirestore } from 'angularfire2/firestore';
import { AngularFireDatabaseModule } from 'angularfire2/database';
import { AngularFireAuthModule } from 'angularfire2/auth';

// import {MdButtonModule, MdListModule, MdToolbarModule} from '@angular/material';
// import { FlexLayoutModule } from '@angular/flex-layout';
// import {MdInputModule} from '@angular/material';
//import { LocalStorageModule } from 'angular-2-local-storage';

//components
import { AppComponent } from './app.component';
import { UserLoginComponent } from './users/user-login/user-login.component';
import { UserProfileComponent } from './users/user-profile/user-profile.component';
import { StarRatingWidgetComponent } from './components/star-rating-widget/star-rating-widget.component';
import { ChatboxComponent } from './components/chatbox/chatbox.component';


//services
import { AuthService } from './core/auth.service';
import { MessagingService } from './providers/messaging.service';
import { UploadService } from './providers/upload.service';
import { ContactService } from './providers/contact.service';
import { StarRatingWidgetService } from './components/star-rating-widget/star-rating-widget.service';

import { environment } from '../environments/environment';

@NgModule({
  imports: [
    BrowserModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule, // imports firebase/auth, only needed for auth features
    AngularFireDatabaseModule, // imports firebase/database, only needed for database features
    BrowserAnimationsModule,
    HttpModule,
    FormsModule,
    ReactiveFormsModule,
    // https://medium.com/codingthesmartway-com-blog/using-bootstrap-with-angular-c83c3cee3f4a
    // NgbModule.forRoot(),
   // LocalStorageModule.withConfig({
    //  prefix: 'chat21-web-widget',
     // storageType: 'localStorage'
     //}),
     MomentModule
  ],
  declarations: [
    AppComponent,
    UserLoginComponent,
    UserProfileComponent,
    StarRatingWidgetComponent,
    ChatboxComponent
  ],
  providers: [
    AuthService,
    MessagingService,
    UploadService,
    ContactService,
    StarRatingWidgetService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
