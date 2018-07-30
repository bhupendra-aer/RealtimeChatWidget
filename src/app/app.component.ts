import { ElementRef, Component, OnInit, OnDestroy, AfterViewInit, ViewChild, HostListener } from '@angular/core';
import * as moment from 'moment';
import { environment } from '../environments/environment';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';

// services
import { AuthService } from './core/auth.service';
import { MessagingService } from './providers/messaging.service';
import { UploadService } from './providers/upload.service';
import { ContactService } from './providers/contact.service';
import { StarRatingWidgetService } from './components/star-rating-widget/star-rating-widget.service';

// models
import { MessageModel } from '../models/message';
import { DepartmentModel } from '../models/department';
import { UploadModel } from '../models/upload';

// utils
import { strip_tags, isPopupUrl, popupUrl, setHeaderDate, searchIndexInArrayForUid, urlify, encodeHTML } from './utils/utils';
// constants
import { CHANNEL_TYPE_DIRECT, CHANNEL_TYPE_GROUP, MSG_STATUS_SENDING, MAX_WIDTH_IMAGES, UID_SUPPORT_GROUP_MESSAGES, TYPE_MSG_TEXT, TYPE_MSG_IMAGE, TYPE_MSG_FILE, MSG_STATUS_SENT, MSG_STATUS_RETURN_RECEIPT, MSG_STATUS_SENT_SERVER, BCK_COLOR_CONVERSATION_SELECTED } from './utils/constants';

// https://www.davebennett.tech/subscribe-to-variable-change-in-angular-4-service/
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/operator/takeWhile';
import { CURR_VER_DEV, CURR_VER_PROD } from '../../current_version';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})



export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('scrollMe') private scrollMe: ElementRef;
    @ViewChild('chat21Content') private chatContent: ElementRef;

    isOpen: boolean; /** indicates if the conversation panel is open or closed */
    subscriptions: Subscription[] = [];
    arrayFiles4Load: Array<any>;
    attributes: any;

    messages: MessageModel[];
    conversationWith: string;
    senderId: string;
    nameFile: string;
    tenant: string;
    recipientId: string;


    myForm: FormGroup;
    public events: any[] = [];
    public submitted: boolean;

    isSelected = false;
    isConversationOpen = true;

    isPopupUrl = isPopupUrl;
    popupUrl = popupUrl;
    strip_tags = strip_tags;

    MSG_STATUS_SENT = MSG_STATUS_SENT;
    MSG_STATUS_SENT_SERVER = MSG_STATUS_SENT_SERVER;
    MSG_STATUS_RETURN_RECEIPT = MSG_STATUS_RETURN_RECEIPT;
    LABEL_PLACEHOLDER = 'Type your message...'; // 'Type your message...';  // type your message...
    LABEL_START_NW_CONV = 'START NEW CONVERSATION'; // 'START NEW CONVERSATION'; //
   
    LABEL_FIRST_MSG = 'Describe shortly your problem, you will be contacted by an agent'; // 'Describe shortly your problem, you will be contacted by an agent';
    LABEL_SELECT_TOPIC = 'Select a topic'; // 'Select a topic';
   
    LABLEL_COMPLETE_FORM = 'Complete the form to start a conversation with the next available agent.'; // 'Complete the form to start a conversation with the next available agent.';
    LABEL_FIELD_NAME = '* Name'; // '* Name';
    LABEL_ERROR_FIELD_NAME = 'Name Required (minimum 5 characters).'; // 'Required field (minimum 5 characters).';
    LABEL_FIELD_EMAIL = '* Email';

    LABEL_ERROR_FIELD_EMAIL = 'Enter a valid email address.'; // 'Enter a valid email address.';
    LABEL_WRITING = 'is writing...'; // 'is writing...';

    BUILD_VERSION = 'v.' + CURR_VER_PROD + ' b.' + CURR_VER_DEV; // 'b.0.5';
    CLIENT_BROWSER = navigator.userAgent;

    textInputTextArea: String;
    HEIGHT_DEFAULT = '40px';
    myStyles = {
        'overflow-x': 'hidden',
        'word-wrap': 'break-word',
        'resize': 'none',
        'overflow-y': 'auto',
        'height': this.HEIGHT_DEFAULT,
        'max-height': '100px',
        'border': 'none',
        'padding': '10px'
    };
    selectedFiles: FileList;
    isWidgetActive: boolean;
    isLogged = false;

    departments: DepartmentModel[];
    attributes_message: any;
    openSelectionDepartment: boolean;
    departmentSelected: DepartmentModel;

    IMG_PROFILE_SUPPORT = 'https://user-images.githubusercontent.com/32448495/39111365-214552a0-46d5-11e8-9878-e5c804adfe6a.png';
    filterSystemMsg =  true; // if true, messages sent by system are not displayed

    writingMessage = '';

    userId: string;
    userFullname: string;
    userEmail: string;
    userPassword: string;
    projectid: string;
    projectname: string;
    preChatForm: boolean;
    chatName: string;
    poweredBy: string;
    channelType: string;

    private aliveSubLoggedUser = true;
    private isNewConversation = true;

    showButtonToBottom = false;
    contentScroll: any;
    NUM_BADGES = 0;

    constructor(
        public authService: AuthService,
        public messagingService: MessagingService,
        public starRatingWidgetService: StarRatingWidgetService,
        public upSvc: UploadService,
        public contactService: ContactService,
        public formBuilder: FormBuilder,
        public el: ElementRef
    ) {
        console.log(' ---------------- COSTRUCTOR ---------------- ');

        this.getVariablesFromAttributeHtml();
        this.settingParams();

        // set auth
        if (this.userEmail && this.userPassword) {
            // if there are emails and psw, I do a firebase authentication with email
            this.authService.authenticateFirebaseEmail(this.userEmail, this.userPassword);
        }
        else if (this.userId) {
            // IF I PASS THE USERID DOES NOT PERMIT ANY AUTHENTICATION
            // this.authService.getCurrentUser();

            this.senderId = this.userId;
            this.createConversation();
            this.initialize();
            this.aliveSubLoggedUser = false;
            console.log('USER userId: this.isOpen:', this.senderId, this.isOpen);
        }
        else {
            // I do anonymous authentication
            this.authService.authenticateFirebaseAnonymously();
        }

        // SET FORM
        this.myForm = this.setForm(this.formBuilder);

        // USER AUTENTICATE
        // http://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/
        const that = this;
        const subLoggedUser: Subscription = this.authService.obsLoggedUser
        .takeWhile(() => that.aliveSubLoggedUser)
        .subscribe(user => {
            if (user) {
                console.log('USER AUTENTICATE: ', user);
                that.senderId = user.uid;
                // that.initConversation();
                that.createConversation();
                that.initialize();
                that.aliveSubLoggedUser = false;
            } else {
                that.isLogged = false;
            }
        });

        this.checkWritingMessages();
    }

    /** */
    settingParams() {
        // SETTINGS
        //// sept widget language
        moment.locale('en');
        //// get isOpen from storage;
        if (sessionStorage.getItem('isOpen') === 'true') {
            this.isOpen = true;
        } else if (sessionStorage.getItem('isOpen') === 'false') {
            this.isOpen = false;
        }
        //// get isWidgetActive (poll) from storage;
        this.isWidgetActive = (sessionStorage.getItem('isWidgetActive')) ? true : false;
       console.log('setting params...');
    }

    /**
     * tenant:
     * recipientId:
     * projectid:
     * chatName:
     * poweredBy:
     * userId:
     * userEmail:
     * userPassword:
     * userFullname:
     * preChatForm:
     *
    */
    getVariablesFromAttributeHtml() {
        // https://stackoverflow.com/questions/45732346/externally-pass-values-to-an-angular-application
        let TEMP;
        TEMP = this.el.nativeElement.getAttribute('tenant');
        this.tenant = (TEMP) ? TEMP : environment.tenant;
        TEMP = this.el.nativeElement.getAttribute('recipientId');
        this.recipientId = (TEMP) ? TEMP : null; // 'Ruzuv8ZrPvcHiORP62rK1fuhmXv1';
        TEMP = this.el.nativeElement.getAttribute('projectid');
        this.projectid = (TEMP) ? TEMP : null; // '5ada1bfc4480840014ab1990'; // '5ad7620d3d1d1a00147500a9';
        TEMP = this.el.nativeElement.getAttribute('projectname');
        this.projectname = (TEMP) ? TEMP : null;
        TEMP = this.el.nativeElement.getAttribute('chatName');
        this.chatName =  (TEMP) ? TEMP : 'Faisal'; // default TileDesk
        TEMP = this.el.nativeElement.getAttribute('poweredBy');
        this.poweredBy = (TEMP) ? TEMP : '<a target="_blank" href="http://www.serverworks.in/">Powered by <b>ServerWorks</b></a>';
        TEMP = this.el.nativeElement.getAttribute('userId');
        this.userId = (TEMP) ? TEMP : null;
        TEMP = this.el.nativeElement.getAttribute('userEmail');
        this.userEmail = (TEMP) ? TEMP : "arjunaer25@gmail.com";
        TEMP = this.el.nativeElement.getAttribute('userPassword');
        this.userPassword = (TEMP) ? TEMP : "welcome123";
        TEMP = this.el.nativeElement.getAttribute('userFullname');
        this.userFullname = (TEMP) ? TEMP : null;
        TEMP = this.el.nativeElement.getAttribute('preChatForm');
        this.preChatForm = (TEMP == null) ? false : true;
        TEMP = this.el.nativeElement.getAttribute('isOpen');
        this.isOpen = (TEMP == null) ? false : true;
        TEMP = this.el.nativeElement.getAttribute('channelType');
        this.channelType = (TEMP) ? TEMP : CHANNEL_TYPE_GROUP;
        console.log('get Variables From AttributeHtml');
    }

    // START FORM
    // https://scotch.io/tutorials/using-angular-2s-model-driven-forms-with-formgroup-and-formcontrol
    /** */
    setForm(formBuilder): FormGroup  {
        // SET FORM
        const EMAIL_REGEXP = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        const myForm = formBuilder.group({
            email: ['', Validators.compose([Validators.required, Validators.pattern(EMAIL_REGEXP)])],
            name: ['', Validators.compose([Validators.minLength(2), Validators.required])]
        });
        return myForm;
    }
    /** */
    subcribeToFormChanges() {
        const that = this;
        const myFormValueChanges$ = this.myForm.valueChanges;
        myFormValueChanges$.subscribe(x => {
            that.userFullname = x.name;
            that.userEmail = x.email;
        });
    }
    /** */
    closeForm() {
        // email recovery entered in the form and fullname
        // save everything in storage and then send them with the message !!!!
        this.attributes.userName = this.userFullname;
        this.attributes.userEmail = this.userEmail;
        if (this.attributes) {
            sessionStorage.setItem('attributes', JSON.stringify(this.attributes));
        }
        this.preChatForm = false;
        this.setFocusOnId('chat21-main-message-context');
    }
    // END FORM

    /**
     * the subscriptions are imposed
     * 1 - message added
     * 2 - modified message
     * 3 - user deleted from the group (CHAT CLOSED)
     */
    setSubscriptions() {
        console.log('setSubscriptions: ');
        const that = this;
        
        // CONVERSATION CLOSING (USER ELIMINATION FROM THE GROUP)
        const subscriptionIsWidgetActive: Subscription = this.starRatingWidgetService.observable
        .subscribe(isWidgetActive => {
            that.isWidgetActive = isWidgetActive;
            if (isWidgetActive === false) {
                sessionStorage.removeItem('isWidgetActive');
                this.conversationWith = null;
                // this.generateNewUidConversation();
                console.log('CHIUDOOOOO!!!!:', that.isConversationOpen, isWidgetActive);
            } else if (isWidgetActive === true) {
                console.log('APROOOOOOOO!!!!:', );
                sessionStorage.setItem('isWidgetActive', 'true');
                that.isConversationOpen = false;
            }
        });
        this.subscriptions.push(subscriptionIsWidgetActive);

        // NEW MESSAGE!!
        const obsAddedMessage: Subscription = this.messagingService.obsAdded
        .subscribe(newMessage => {
            if (that.scrollMe) {
                const divScrollMe = that.scrollMe.nativeElement;
                const checkContentScrollPosition = that.checkContentScrollPosition(divScrollMe);
                if (checkContentScrollPosition ) {
                    // https://developer.mozilla.org/it/docs/Web/API/Element/scrollHeight
                    console.log("------->I'm at the end of the scrooll:");
                    setTimeout(function() {
                        that.scrollToBottom();
                    }, 500);
                } else {
                    // monster badge
                    that.NUM_BADGES ++;
                }
            }
        });
        this.subscriptions.push(obsAddedMessage);
    }

    ngOnInit() {
        // this.setSubscriptions();
    }

    ngAfterViewInit() {
        // const that = this;
        // setTimeout(function() {
        //     that.setSubscriptions();
        // }, 2000);
    }

    /**
     * I delete all the subscriptions
     */
    ngOnDestroy() {
        this.unsubscribe();
    }

    unsubscribe() {
        this.subscriptions.forEach(function(subscription) {
            subscription.unsubscribe();
        });
        this.subscriptions.length = 0;
        console.log('this.subscriptions', this.subscriptions);
    }

    /**
     * initialize variables
     * I log in anonymously on firebase
     * if the login was successful recovery user id
     */
    initialize() {
        this.messages = this.messagingService.messages;
        this.arrayFiles4Load = [];
        this.attributes = this.setAttributes();
        console.log('RESET MESSAGES AND ADD SUBSCRIBES: ', this.messages);
        this.setSubscriptions();

        this.openSelectionDepartment = false;
        if (!this.attributes.departmentId) {
            this.departmentSelected = null;
            // this.openSelectionDepartment = true;
        }
        // Configure the authentication form
        if (!this.attributes.userEmail && !this.attributes.userName && this.preChatForm) {
            if (this.myForm) {
                this.subcribeToFormChanges();
            }
        } else {
            this.userEmail = this.attributes.userEmail;
            this.userFullname = this.attributes.userName;
            this.preChatForm = false;
        }

    }

    setAttributes(): any {
        let attributes: any = JSON.parse(sessionStorage.getItem('attributes'));
        // let attributes: any = JSON.parse(sessionStorage.getItem('attributes'));
        if (!attributes || attributes === 'undefined') {
            attributes = {
                client: this.CLIENT_BROWSER,
                sourcePage: location.href,
                // departmentId: '',
                // departmentName: '',
                // departmentId: this.departmentSelected._id,
                // departmentName: this.departmentSelected.name,
                userEmail: this.userEmail,
                userName: this.userFullname
            };
            console.log('>>>>>>>>>>>>>> setAttributes: ', JSON.stringify(attributes));
            sessionStorage.setItem('attributes', JSON.stringify(attributes));
        }
        return attributes;
    }
    /**
     *I create a new conversationWith
     * to login or to open a new conversation
     */
    generateNewUidConversation() {
        console.log('generateUidConversation **************', this.conversationWith, this.senderId);
        this.conversationWith = this.messagingService.generateUidConversation(this.senderId);
    }


    /**
     * IMPOSED: senderId, recipientId, conversationId, conversationWith
     * 1 - recovery of the senderId of the logged-in user who writes
     * 2 - recovery recipientId set in the environment file
     * 3 - initialize messaging service
     * 4 - recovery of conversation messages
     */

    // initConversation() {
    //     if (this.recipientId) {
    //         this.conversationWith = this.recipientId;
    //     } else {
    //         const key = sessionStorage.getItem(this.loggedUser.uid);
    //         console.log('key:', key, this.loggedUser.uid, sessionStorage);
    //         if (key) {
    //             this.conversationWith = key;
    //         } else {
    //             this.conversationWith = this.messagingService.generateUidConversation(this.loggedUser.uid);
    //         }
    //     }
    //     // set tenant
    //     if (!this.tenant) {
    //         this.tenant = environment.tenant;
    //     }
    //     console.log('initConversation:  this.conversationWith -> ' + this.conversationWith + '  tenant -> ' + this.tenant);
    // }
    /**
     * SET:
     * token,
     * senderId,
     * channelType: CHANNEL_TYPE_DIRECT / CHANNEL_TYPE_GROUP
     * conversationWith: recipientId / auto generate
     * INIT:
     * messagingService,
     * upSvc,
     * contactService,
     * messagingService
     */
    createConversation() {
        const that = this;
        const token = this.authService.token;

        let channelTypeTEMP = CHANNEL_TYPE_GROUP;
        if (this.recipientId) {
            if (this.recipientId.indexOf('group') !== -1 ) {
                channelTypeTEMP = CHANNEL_TYPE_GROUP;
            } else if (!this.projectid) {
                channelTypeTEMP = CHANNEL_TYPE_DIRECT;
            }
            this.conversationWith = this.recipientId;
        } else {
            // channelType = CHANNEL_TYPE_GROUP;
            this.conversationWith = sessionStorage.getItem(this.senderId);
            if (!this.conversationWith) {
                this.conversationWith = this.messagingService.generateUidConversation(this.senderId);
            }
        }

        if (!this.channelType || (this.channelType !== CHANNEL_TYPE_GROUP && this.channelType !== CHANNEL_TYPE_DIRECT )) {
            this.channelType = channelTypeTEMP;
        }
        this.messagingService.initialize(this.senderId,  this.tenant, this.channelType);
        this.upSvc.initialize(this.senderId,  this.tenant, this.conversationWith);
        this.contactService.initialize(this.senderId, this.tenant, this.conversationWith);
        this.messagingService.checkListMessages(this.conversationWith)
        .then(function(snapshot) {
            console.log('checkListMessages: ', snapshot);
            if (snapshot.exists()) {
                that.isNewConversation = false;
                setTimeout(function() {
                    if (that.messages.length === 0) {
                        that.isNewConversation = true;
                    }
                }, 2000);
                that.isLogged = true;
                that.setFocusOnId('chat21-main-message-context');
            } else {
                that.isNewConversation = true;
                if (that.projectid && !that.attributes.departmentId) {
                    that.isLogged = false;
                    that.getMongDbDepartments();
                } else {
                    that.setFocusOnId('chat21-main-message-context');
                    that.isLogged = true;
                }
            }

            setTimeout(function() {
                that.messagingService.listMessages(that.conversationWith);
            }, 500);


        }).catch(function(error) {
            console.log('checkListMessages ERROR: ', error);
        });
    }

    checkWritingMessages() {
        // this.messagingService.checkWritingMessages();
        const that = this;
        const subscription: Subscription = this.messagingService.obsCheckWritingMessages
        // .takeWhile(() => that.subscriptionIsWriting)
        .subscribe(resp => {
            console.log('2 - subscribe IS: ', resp + ' ****************');
            if (resp) {
                setTimeout(function() {
                    that.writingMessage = that.LABEL_WRITING;
                }, 1000);
            } else {
                that.writingMessage = '';
            }
        });

    }


    /**
     * recovery departments list
     * - recovery of the fixed token
     * - I subscribe to the service
     * - if there is only one department the default septum
     * - otherwise I will display the department selection screen
    */
    getMongDbDepartments() {
        const token = this.authService.token;
        this.messagingService.getMongDbDepartments(token, this.projectid)
        .subscribe(
            response => {
                console.log('OK DEPARTMENTS ::::', response);
                this.departments = response;
                if (this.departments.length === 1) {
                    // this.setDepartment(this.departments[0]);
                    this.openSelectionDepartment = false;
                    this.departmentSelected = this.departments[0];
                    this.setFocusOnId('chat21-main-message-context');
                    console.log('this.departmentSelected ::::', this.departmentSelected);
                } else if (this.departments.length > 0) {
                    this.setFocusOnId('chat21-modal-select');
                    // I exclude department with default == true
                    let i = 0;
                    this.departments.forEach(department => {
                        // console.log('DEPARTMENT ::::', department);
                        if (department['default'] === true) {
                            // console.log('ELIMINO DEPARTMENT::::', department);
                            this.departments.splice(i, 1);
                            // console.log('DEPARTMENTS::::', this.departments);
                            return;
                        }
                        i++;
                    });
                    this.openSelectionDepartment = true;
                } else {
                    this.setFocusOnId('chat21-main-message-context');
                    this.openSelectionDepartment = false;
                }
                this.isLogged = true;
            },
            errMsg => {
                console.log('http ERROR MESSAGE', errMsg);
                // window.alert('MSG_GENERIC_SERVICE_ERROR');
                this.openSelectionDepartment = false;
                this.setFocusOnId('chat21-main-message-context');
            },
            () => {
                console.log('API ERROR NESSUNO');
                // active aprichat button!!!!!
            }
        );
    }

    /** */
    setDepartment() {
        // this.openSelectionDepartment = false;
        // this.departmentSelected = department;
        if (!this.attributes.departmentId && this.departmentSelected) {
            this.attributes.departmentId = this.departmentSelected._id;
            this.attributes.departmentName = this.departmentSelected.name;
            console.log('setAttributes setDepartment: ', JSON.stringify(this.attributes));
            if (this.attributes) {
                sessionStorage.setItem('attributes',  JSON.stringify(this.attributes));
            }
            // JSON.stringify(this.attributes)
        }
    }


    //// ACTIONS ////

    setFocusOnId(id) {
        // id = 'chat21-main-message-context';
        if (this.preChatForm) {
            id = 'form-field-name';
        }
        console.log('-------------> setFocusOnId: ', id);
        setTimeout(function() {
            const textarea = document.getElementById(id);
            if (textarea) {
                console.log('1--------> FOCUSSSSSS : ', textarea);
                textarea.setAttribute('value', ' ');
                textarea.focus();
            }
        }, 500);
    }

    /** */
    onSelectDepartment(department) {
        console.log('onSelectDepartment: ', department);
        // this.departmentSelected = department;
        // this.setDepartment(department);
        this.openSelectionDepartment = false;
        this.departmentSelected = department;
        this.setFocusOnId('chat21-main-message-context');
    }
    /**
     * I open the popup conversations
     */
    f21_open() {
        if (this.senderId) {
            this.isOpen = true; // !this.isOpen;
            sessionStorage.setItem('isOpen', 'true');
            // https://stackoverflow.com/questions/35232731/angular2-scroll-to-bottom-chat-style
            console.log('f21_open   ---- isOpen::', this.isOpen, this.attributes.departmentId);
            this.scrollToBottom();
            // console.log('FOCUSSSSSS 5: ', document.getElementById('chat21-main-message-context'));
            if (this.attributes.departmentId) {
                this.setFocusOnId('chat21-main-message-context');
            }
            // }
        }
    }

    /**
    * I close the popup conversations
    */
    f21_close() {
        console.log('isOpen::', this.isOpen);
        this.isOpen = false;
        sessionStorage.setItem('isOpen', 'false');
        // sessionStorage.removeItem('isOpen');
    }

    /**
     * check the message list last
     * called in a recursive manner until it answers correctly
     */
    scrollToBottom() {
        const that = this;
        setTimeout(function() {
            try {
                const objDiv = document.getElementById('chat21-contentScroll');
                console.log('scrollTop1 ::', objDiv.scrollTop,  objDiv.scrollHeight);
                //// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
                objDiv.scrollIntoView(false);
                // that.badgeNewMessages = 0;
            } catch (err) {
                console.log('RIPROVO ::', that.isOpen);
                if (that.isOpen === true) {
                    that.scrollToBottom();
                }
            }
        }, 300);
    }


    /**
     *
     */
    // LISTEN TO SCROLL POSITION
    onScroll(event: any): void {
        if (this.scrollMe) {
            const divScrollMe = this.scrollMe.nativeElement;
            const checkContentScrollPosition = this.checkContentScrollPosition(divScrollMe);
            if (checkContentScrollPosition) {
                this.showButtonToBottom = false;
                this.NUM_BADGES = 0;
            // this.scrollToBottom();
            } else {
                this.showButtonToBottom = true;
            }
        }
    }

    /**
     *
     * @param divScrollMe
     */
    checkContentScrollPosition(divScrollMe): boolean {
        // console.log('checkContentScrollPosition ::', divScrollMe);
        // console.log('divScrollMe.diff ::', divScrollMe.scrollHeight - divScrollMe.scrollTop);
        // console.log('divScrollMe.clientHeight ::', divScrollMe.clientHeight);
        if (divScrollMe.scrollHeight - divScrollMe.scrollTop <= (divScrollMe.clientHeight + 60)) {
            // console.log('I AM AT THE END ::');
            return true;
        } else {
            return false;
        }
    }

    /**
     * resize the textarea
     * called whenever the content of the textarea changes
     */
    resizeInputField() {
        const target = document.getElementById('chat21-main-message-context');
        if (!target) {
            return;
        }
        // tslint:disable-next-line:max-line-length
        // console.log('H:: this.textInputTextArea', (document.getElementById('chat21-main-message-context') as HTMLInputElement).value , target.style.height, target.scrollHeight, target.offsetHeight, target.clientHeight);
        target.style.height = '100%';
        if ( (document.getElementById('chat21-main-message-context') as HTMLInputElement).value === '\n' ) {
            console.log('STEP 0');
            (document.getElementById('chat21-main-message-context') as HTMLInputElement).value = '';
            target.style.height = this.HEIGHT_DEFAULT;
        } else if (target.scrollHeight > target.offsetHeight ) {
            console.log('STEP 2');
            target.style.height = target.scrollHeight + 2 + 'px';
        } else {
            console.log('STEP 3');
            target.style.height = this.HEIGHT_DEFAULT;
            // segno sto scrivendo
            // target.offsetHeight - 15 + 'px';
        }
        // tslint:disable-next-line:max-line-length
        console.log('H:: this.textInputTextArea', this.textInputTextArea, target.style.height, target.scrollHeight, target.offsetHeight, target.clientHeight);
    }

    /**
     * when I press a button I call this method which:
     * check if 'send' has been pressed
     * if you reset text
     * set field height as default min
     * leverage the focus and reset it after a few moments
     * (this is a patch to keep the focus and eliminate the br of the sending !!!)
     * sending message
     * @param event
     */
    onkeypress(event) {
        // const msg = document.getElementsByClassName('f21textarea')[0];
        const msg = ((document.getElementById('chat21-main-message-context') as HTMLInputElement).value);
        const keyCode = event.which || event.keyCode;
        // console.log('onkeypress **************', keyCode, msg);
        if (keyCode === 13) {
            if (msg && msg.trim() !== '') {
                // console.log('sendMessage -> ', this.textInputTextArea);
                this.resizeInputField();
                // this.messagingService.sendMessage(msg, TYPE_MSG_TEXT);
                this.setDepartment();
                this.sendMessage(msg, TYPE_MSG_TEXT);
                this.scrollToBottom();
            }
            (<HTMLInputElement>document.getElementById('chat21-main-message-context')).value = '';
            // this.textInputTextArea = '';
        }
    }

    // START LOAD IMAGE //
    /**
     *
     * @param event
     */
    detectFiles(event) {
        console.log('detectFiles: ', event);
        if (event) {
            this.selectedFiles = event.target.files;
            console.log('fileChange: ', event.target.files);
            const that = this;
            if (event.target.files && event.target.files[0]) {
                this.nameFile = event.target.files[0].name;
                const typeFile = event.target.files[0].type;
                const reader  = new FileReader();
                console.log('OK preload: ', this.nameFile, typeFile, reader);
                reader.addEventListener('load', function () {
                    console.log('addEventListener load', reader.result);
                    that.isSelected = true;
                    // se inizia con image
                    if (typeFile.startsWith('image')) {
                        const imageXLoad = new Image;
                        imageXLoad.src = reader.result;
                        imageXLoad.title = that.nameFile;
                        imageXLoad.onload = function() {
                            console.log('onload ');
                            // that.arrayFiles4Load.push(imageXLoad);
                            const uid = imageXLoad.src.substring(imageXLoad.src.length - 16);
                            that.arrayFiles4Load[0] = {uid: uid, file: imageXLoad, type: typeFile};
                            console.log('OK: ', that.arrayFiles4Load[0]);
                        };
                    } else {
                        const fileXLoad  = {
                            src: reader.result,
                            title: that.nameFile
                        };
                        console.log('onload ');
                        // that.arrayFiles4Load.push(imageXLoad);
                        const uid = fileXLoad.src.substring(fileXLoad.src.length - 16);
                        that.arrayFiles4Load[0] = {uid: uid, file: fileXLoad, type: typeFile};
                        console.log('OK: ', that.arrayFiles4Load[0]);
                    }
                }, false);
                if (event.target.files[0]) {
                    reader.readAsDataURL(event.target.files[0]);
                    console.log('reader-result: ', event.target.files[0]);
                }
            }
        }
    }

    /**
     *
     */

    loadFile() {
        console.log('that.fileXLoad: ', this.arrayFiles4Load);
        // at the moment I only manage uploading one image at a time
        if (this.arrayFiles4Load[0] && this.arrayFiles4Load[0].file) {
            const fileXLoad = this.arrayFiles4Load[0].file;
            const uid = this.arrayFiles4Load[0].uid;
            const type = this.arrayFiles4Load[0].type;
            console.log('that.fileXLoad: ', type);
            let metadata;
            if (type.startsWith('image')) {
                metadata = {
                    'name': fileXLoad.name,
                    'src': fileXLoad.src,
                    'width': fileXLoad.width,
                    'height': fileXLoad.height,
                    'type': type,
                    'uid': uid
                };
            } else {
                metadata = {
                    'name': fileXLoad.name,
                    'src': fileXLoad.src,
                    'type': type,
                    'uid': uid
                };
            }
            this.scrollToBottom();
            // 1 - I add a message locally
            // this.addLocalMessageImage(metadata);
            // 2 - image load
            const file = this.selectedFiles.item(0);
            this.uploadSingle(metadata, file);
            this.isSelected = false;
        }
    }

    /**
     * save a message locally in the msg array
     * @param metadata
     */
    addLocalMessageImage(metadata) {
        const now: Date = new Date();
        const timestamp = now.valueOf();
        const language = document.documentElement.lang;

        // set recipientFullname
        let recipientFullname = 'Guest';
        if (this.userFullname) {
            recipientFullname = this.userFullname;
        } else if (this.userEmail) {
            recipientFullname = this.userEmail;
        }
        const projectname = (this.projectname) ? this.projectname : this.projectid;
        recipientFullname += ' - ' + projectname;

        // set senderFullname
        const senderFullname = recipientFullname;

        const message = new MessageModel(
            metadata.uid, // uid
            language, // language
            this.conversationWith, // recipient
            recipientFullname, // recipient_fullname
            this.senderId, // sender
            senderFullname, // sender_fullname
            '', // status
            metadata, // metadata
            '', // text
            timestamp, // timestamp
            '', // headerDate
            TYPE_MSG_IMAGE, // type
            '',
            this.channelType
        );
        // this.messages.push(message);
        // message.metadata.uid = message.uid;
        console.log('addLocalMessageImage: ', this.messages);
        this.isSelected = true;
        this.scrollToBottom();
    }

    /**
     *
     */
    resetLoadImage() {
        this.nameFile = '';
        this.selectedFiles = null;
        console.log('1 selectedFiles: ', this.selectedFiles);
        delete this.arrayFiles4Load[0];
        document.getElementById('chat21-file').nodeValue = null;
        // event.target.files[0].name, event.target.files
        this.isSelected = false;
    }

    /**
     *
     * @param message
     */
    getSizeImg(message): any {
        const metadata = message.metadata;
        // const MAX_WIDTH_IMAGES = 300;
        const sizeImage = {
            width: metadata.width,
            height: metadata.height
        };
        // console.log('message::: ', metadata);
        if (metadata.width && metadata.width > MAX_WIDTH_IMAGES) {
            const rapporto = (metadata['width'] / metadata['height']);
            sizeImage.width = MAX_WIDTH_IMAGES;
            sizeImage.height = MAX_WIDTH_IMAGES / rapporto;
        }
        return sizeImage; // h.toString();
    }

    /**
     *
     * @param metadata
     * @param file
     */
    uploadSingle(metadata, file) {
        const that = this;
        const send_order_btn = <HTMLInputElement>document.getElementById('chat21-start-upload-doc');
        send_order_btn.disabled = true;
        console.log('uploadSingle: ', metadata, file);
        // const file = this.selectedFiles.item(0);
        const currentUpload = new UploadModel(file);
        this.upSvc.pushUpload(currentUpload)
        .then(function(snapshot) {
            console.log('Uploaded a file! ', snapshot.downloadURL);
            metadata.src = snapshot.downloadURL;
            let type_message = TYPE_MSG_TEXT;
            let message = 'File: ' + metadata.src;
            if (metadata.type.startsWith('image')) {
                type_message = TYPE_MSG_IMAGE;
                message = 'Image: ' + metadata.src;
            }
            that.sendMessage(message, type_message, metadata);
            that.scrollToBottom();
        })
        .catch(function(error) {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log('error: ', errorCode, errorMessage);
        });
        // this.resetLoadImage();
        console.log('reader-result: ', file);
    }

    /**
     *sending the message
     * @param msg
     * @param type
     * @param metadata
     */
    sendMessage(msg, type, metadata?) {
        (metadata) ? metadata = metadata : metadata = '';
        console.log('SEND MESSAGE: ', msg, type, metadata, this.attributes);
        if (msg && msg.trim() !== '' || type !== TYPE_MSG_TEXT ) {
            // set recipientFullname
            let recipientFullname = 'Guest';
            if (this.userFullname) {
                recipientFullname = this.userFullname;
            } else if (this.userEmail) {
                recipientFullname = this.userEmail;
            }
            const projectname = (this.projectname) ? this.projectname : this.projectid;
            if (projectname) {
                recipientFullname += ' - ' + projectname;
            }

            // set senderFullname
            const senderFullname = recipientFullname;

            // tslint:disable-next-line:max-line-length
            this.messagingService.sendMessage(recipientFullname, msg, type, metadata, this.conversationWith, recipientFullname, this.attributes, this.projectid);
            this.isNewConversation = false;
            // this.checkWritingMessages();
        }
    }

    /**
     * update message: uid, status, timestamp, headerDate
     * referred to the signing of the addition of a message
     * in case the message is an image and has been sent by the user
     */
    updateMessage(message) {
        console.log('UPDATE MSG:', message.metadata.uid);
        const index = searchIndexInArrayForUid(this.messages, message.metadata.uid);
        if (index > -1) {
            this.messages[index].uid = message.uid;
            this.messages[index].status = message.status;
            this.messages[index].timestamp = message.timestamp;
            this.messages[index].headerDate = message.headerDate;
            console.log('UPDATE ok:', this.messages[index]);
        } else {
            this.messages.push(message);
        }
    }

    /**
     * recovery url image profile
     * @param uid
     */
    getUrlImgProfile(uid): string {
        // tslint:disable-next-line:curly
        if (!uid) return this.IMG_PROFILE_SUPPORT;
        const profile = this.contactService.getContactProfile(uid);
        if (profile && profile.imageurl) {
            return profile.imageurl;
        } else {
            return this.IMG_PROFILE_SUPPORT;
        }
    }

    /**
     * by pressing the 'OPEN ONE NW CONVERSATION' button
     * active a new conversation
     */
    startNwConversation() {
        console.log('this.startNwConversation 2');

        this.constructor();

        this.ngOnDestroy();
        console.log('unsubscribe OK', this.subscriptions);

        this.generateNewUidConversation();
        console.log('NEW conversationWith:', this.conversationWith);

        this.createConversation();
        console.log('NEW createConversation: ');

        this.initialize();
        console.log('NEW initialize: ');

        this.isConversationOpen = true;
        console.log('NEW SUBSRIBE -->' + this.isConversationOpen + ' <--');

    }

    convertMessage(msg) {
        let messageText = encodeHTML(msg);
        messageText = urlify(messageText);
        // console.log('messageText: ' + messageText);
        return messageText;
    }

}
