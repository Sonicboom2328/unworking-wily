import React from 'react';
import { Text,View, TouchableOpacity, StyleSheet, Image, TextInput, Alert, KeyboardAvoidingView,ToastAndroid} from 'react-native';
import * as Permissions from 'expo-permissions';
import {BarCodeScanner} from 'expo-barcode-scanner';
import firebase from 'firebase';
import db from '../config';

export default class TransactionScreen extends React.Component{
    constructor(){
        super();
        this.state={
hasCameraPermissions:null,
scanned:false,
scannedBookId:'',
scannedStudentId:'',
buttonState:'normal',
transactionMessage:'',
        }
    }
    getCameraPermissions=async(id)=>{
        const {status}=await Permissions.askAsync(Permissions.CAMERA);
        this.setState({
            hasCameraPermissions:status==="granted",
            buttonState:id,
            scanned:false
        })
    }
    handleBarcodeScanned=async({type,data})=>{
        const {buttonState}=this.state
        if(buttonState==="BookId"){
        this.setState({
            scanned:true,
            scannedBookId:data,
            buttonState:'normal',
        })
        }
        else if (buttonState==="StudentId"){
            this.setState({
                scanned:true,
                scannedStudentId:data,
                buttonState:'normal',
            })  
        }
    }
    initiateBookIssue=async()=>{
        db.collection("transactions").add({
            studentId:this.state.scannedStudentId,
            bookId:this.state.scannedBookId,
            data:firebase.firestore.Timestamp.now().toDate(),
            transactionType:"Issue",
             })
             db.collection("books").doc(this.state.scannedBookId).update({
                 bookAvailability:false,
             })
             db.collection("students").doc(this.state.scannedStudentId).update({
                numberOfBooksIssued:firebase.firestore.FieldValue.increment(1)
             })
             this.setState({
          scannedStudentId:'',
            scannedBookId:'',     
             })
    }
    initiateBookReturn=async()=>{
        db.collection("transactions").add({
            studentId:this.state.scannedStudentId,
            bookId:this.state.scannedBookId,
            data:firebase.firestore.Timestamp.now().toDate(),
            transactionType:"Return",
             })
             db.collection("books").doc(this.state.scannedBookId).update({
                 bookAvailability:true,
             })
             db.collection("students").doc(this.state.scannedStudentId).update({
                 numberOfBooksIssued:firebase.firestore.FieldValue.increment(-1)
             })
             this.setState({
                scannedStudentId:'',
                  scannedBookId:'',     
                   })
             
    }
    checkBookEligibility=async()=>{
        const bookRef=await db.collection("books").where("bookId","==",this.state.scannedBookId).get();
         var transactionType="";
         if(bookRef.docs.length==0){
             transactionType=false;
         }else{
             bookRef.docs.map(doc=>{
                 var book=doc.data();
                 if(book.bookAvailability){
                     transactionType="Issue";
                 }
                 else{
                     transactionType="Return"
                    }
             })
         }
         return transactionType
    }
    checkStudentEligibilityForBookIssue=async()=>{
const studentRef=await db.collection("students").where("studentId","==",this.state.scannedStudentId).get();
var isStudentEligible=""
if(studentRef.docs.length==0){
    this.setState({
        scannedStudentId='',
scannedBookId=''
    })
    isStudentEligible=false
    Alert.alert("STUDENT ID DOES NOT EXIST! GET OUT OF HERE FRAUD! >:(")
}else{
    studentRef.docs.map((doc)=>{
        var student=doc.data();
        if(student.numberOfBooksIssued<2){
            isStudentEligible=true
        }else{
            isStudentEligible=false
            Alert.alert("STUDENT ISSUED 2 BOOKS ALREADY! TOO MUCH READIN' AI'NT GOOD FOR YOU!")
            this.setState({
                scannedStudentId='',
        scannedBookId=''
            })      
            }
    })
    
}
return isStudentEligible
}
chechStudentEligibilityForBookReturn=async()=>{
    const transactionRef= await db.collection("transactions").where("bookId","==",this.state.scannedBookId).limit(1).get();
    var isStudentEligible=""
    transactionRef.docs.map(doc=>{
        var lastBookTransaction=doc.data();
        if(lastBookTransaction.studentId===this.state.scannedStudentId){
            isStudentEligible=true;
        }
        else{
            isStudentEligible=false
            Alert.alert("this book was not issued by YOU. IT WAS ISSUED BY SOMEONE ELSE!")
            this.setState({
                scannedStudentId='',
        scannedBookId=''
            })
        }
    })
    return isStudentEligible
}
    handleTransaction=async()=>{
        var transactionType=await this.checkBookEligibility();
        if(!transactionType){
            Alert.alert("The book does not exist in the library Database! sorry. hope you get it next time! :)")
            this.setState({
                scannedStudentId:'',
                scannedBookId:''
            })
        }else if(transactionType==="issue"){
            var isSudentEligible=await this.checkStudentEligibilityForBookIssue();
            if(isSudentEligible){
                this.initiateBookIssue();
                Alert.alert("BOOK ISSUED TO YOU! READ N RETURN! ENJOY");
            }
        }else{
            var isSudentEligible=await this.checkStudentEligibilityForBookReturn();
            if(isSudentEligible){
            this.initiateBookReturn();
            Alert.alert("BOOK RETURNED! HOPE YOU ENJOYED! :)");
        }
    }
    }
    render(){
        const hasCameraPermissions=this.state.hasCameraPermissions;
        const scanned=this.state.scanned;
        const buttonState=this.state.buttonState;
        if (buttonState!=="normal" && hasCameraPermissions){
            return(
                <BarCodeScanner
                onBarCodeScanned={scanned?undefined:this.handleBarcodeScanned}
                style={StyleSheet.absoluteFillObject}
                />
            )
        }else if(buttonState==="normal"){
        return (
<KeyboardAvoidingView style={styles.container} behaviour="padding" enabled>
    <View>  
    <Image
    source={require("../assets/booklogo.jpg")}
    style={{width:200,height:200}} />
    <Text style={{textAlign:'center',fontSize:30}}>WILY :)📕</Text>
    </View>
    <View style={styles.inputView}>
        <TextInput
        style={styles.inputBox}
        placeholder="Book Id"
        onChangeText={text=>this.setState({scannedBookId:text})}
        value={this.state.scannedBookId}/>
            <TouchableOpacity
            style={styles.scanButton}
            onPress={()=>{this.getCameraPermissions("BookId")}}>
        <Text style={styles.buttonText} >Scan</Text>
</TouchableOpacity>
    </View>
    <View style={styles.inputView}>
    <TextInput
        style={styles.inputBox}
        placeholder="Student Id"
        onChangeText={text=>this.setState({scannedStudentId:text})}        
        value={this.state.scannedStudentId}/>
            <TouchableOpacity
            style={styles.scanButton}
            onPress={()=>{this.getCameraPermissions("StudentId")}}>
        <Text style={styles.buttonText} >Scan</Text>
</TouchableOpacity>
    </View>
    <TouchableOpacity
    style={styles.submitButton}
    onPress={async()=>{
        var transactionMessage=this.handleTransaction()
        this.setState({
        scannedBookId:'',
        scannedStudentId:''
        })
        }}>
          <Text style={styles.submitButtonText}>Submit</Text>
    </TouchableOpacity>
</KeyboardAvoidingView>
        )
    }
}
}
const styles=StyleSheet.create({
    container:{
        flex:1,
        justifyContent:'center',
        alignitems:'center',
    },
    displayText:{
        fontSize:15,
        textDecorationLine:'underline',
    },
    scanButton:{
        backgroundColor:'#66BB6A',
        padding:10,
        margin:10,
        width:50,
        borderWidth:1.5,
        borderLeftWidth:0
    },
    buttonText:{
fontSize:15,
textAlign:'center',
marginTop:10
    },
    inputView:{
flexDirection:'row',
margin:20
    },
    inputBox:{
        width:200,
        height:40,
        borderWidth:1.5,
        borderRightWidth:0,
        fontSize:20
    },
    submitButton:{
backgroundColor:'#FBC02D',
width:10,
height:50
    },
    submitButtonText:{
        padding:10,
    textAlign:'center',
    fontSize:20,
    fontWeight:'bold',
    color:'white'
    }
})