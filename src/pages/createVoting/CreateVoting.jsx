import React, { Component } from 'react'
import {Button, Form, FormGroup, FormControl, ControlLabel, Glyphicon, Grid, Row, Col} from 'react-bootstrap'
import SmartVotingContract from '../../../build/contracts/SmartVoting.json'
import getWeb3 from '../../utils/getWeb3'
import Datetime from 'react-datetime'
import moment from 'moment'
import 'react-datetime/css/react-datetime.css'
import qr from 'qr-image'
import jspdf from 'jspdf'
var ethKeys = require("ethereumjs-keys");

class CreateVoting extends Component{
	constructor(props) {
    super(props)

    this.state = {
      web3: null,
      voterKeys: [],
      voterAddresses: [],
      voterCount: 0,
      candidates: [],
      startDate: 0,
      endDate: 0,
      smartVotingInstance: null
    }
    this.password = '';
    this.createVoting = this.createVoting.bind(this);
    this.instantiateContract = this.instantiateContract.bind(this);
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.
    getWeb3
    .then(results => {
      this.setState({
        web3: results.web3,
      },function(){
				this.instantiateContract();		 	
      })
    })
    .catch(() => {
      console.log('Error finding web3.')
    })

  }

  componentDidMount(){
  }

  instantiateContract() {
  	if(this.state.web3){
	    const contract = require('truffle-contract')
	    const smartVoting = contract(SmartVotingContract)
	    smartVoting.setProvider(this.state.web3.currentProvider)

	    // Declaring this for later so we can chain functions on SimpleStorage.

	    smartVoting.deployed().then(instance => {
	    	this.smartVotingInstance = instance;
	    	return this.smartVotingInstance.numberOfElections()
	    }).then(numElections => { // Arrow function for using "this"
	    	console.log("Number of elections so far is: " + numElections);
	    })

	    this.state.web3.eth.getAccounts((error, accounts) => {
	    	console.log(accounts);
	    })
	  }
	  else {
	  	console.log("NO WEB3");
	  }
  }

  createVoting = () => {
		this.generateKeys();

	}

	generateKeys = () => {
		// User-specified password 
		var password = "wheethereum";
		// Key derivation function (default: PBKDF2) 
		var kdf = "pbkdf2"; // "scrypt" to use the scrypt kdf 
		// Generate private key and the salt and initialization vector to encrypt it
		var keys = [];
		var addresses = [];
		for (var i=0; i < this.state.voterCount; i++){
			var k = ethKeys.create();
			keys.push(k);
			addresses.push(k.privateKey.toString('hex'));
		}
		this.setState({ voterKeys: keys });
		this.setState({ voterAddresses: addresses }, function () {
	    console.log(this.state.voterAddresses);
			this.generateQRCodes();	    
		});

	}

	generateQRCodes = () => {		
		var QRs = [];
		for(var i=0; i < this.state.voterCount; i++){
			var temp = {
				address: this.state.voterAddresses[i],
				candidates: this.state.candidates
			}	
			console.log(temp);
			QRs.push( qr.imageSync(JSON.stringify(temp).toString('base64'), { type: 'png', margin: 8 }) );
		}

		var doc = new jspdf('p', 'mm', 'a4');
		var posX = 0;
		var posY = 0;
		var size = 70; // Square codes, single size sufficient
		var qrPerLine = 3;
		var paperX = 210; // a4 dimensions
		var paperY = 297;
		for (var i = 0; i < this.state.voterCount; i++) {
			doc.addImage(QRs[i], 'PNG', posX, posY, size , size, "qr" + i);
			posX += size;
			if(posX >= paperX){ // Next line
				posX = 0;
				posY += size;
			}	
			if (posY >= paperY-size){ // Next page
				doc.addPage();
				posX = 0;
				posY = 0;
			}
		}
		doc.save("voters.pdf");
	}


  // Voter Handlers
  handleVoterChange = (e) => {
    this.setState({ voterCount: e.target.value });
  }

  /*
  handleAddVoter = () => {
    this.setState({ voters: this.state.voters.concat([{ address: '' }]) });
  }
  handleRemoveVoter = (idx) => () => {
    this.setState({ voters: this.state.voters.filter((v, sidx) => idx !== sidx) });
  }  
	*/
  // Candidate Handlers
  handleCandidateChange = (idx) => (evt) =>{
  	const newCandidates = this.state.candidates.map((candidate, sidx) => {
      if (idx !== sidx) return candidate;
      return { ...candidate, name: evt.target.value };
    });
    this.setState({ candidates: newCandidates });
  }
  handleAddCandidate = () => {
    this.setState({ candidates: this.state.candidates.concat([{ name: '' }]) });
  }
  handleRemoveCandidate = (idx) => () => {
    this.setState({ candidates: this.state.candidates.filter((v, sidx) => idx !== sidx) });
  }  

  // Handle Dates
  handleStartDateChange = (moment) => {
  	this.setState({ startDate : moment.seconds(0).format('X')})
  }
  handleEndDateChange = (moment) => {
  	this.setState({ endDate : moment.seconds(0).format('X')})
  }
  isValidStartDate = (current) => {
  	var yesterday = Datetime.moment().subtract( 1, 'day' );
  	return current.isAfter( yesterday );
  }
  isValidEnd = (current) => {
  	var start = this.state.startDate;
  	return current.isAfter(moment.unix(start).subtract( 1, 'day' ));
  }
	render(){
		return(
		<div className="page">
			<Grid>
				<h1> Here you can create votings</h1>
				<Form>
					<FormGroup>
						<Row>
							<p> Enter Number of Voters </p>	
						</Row>
						<Row>
							<Col md={6}>
								<FormControl
									id="voter-count"
									type="text"
									placeholder="Number of voters"
									value={this.state.voterCount}
									onChange={this.handleVoterChange}
								/>
							</Col>
						</Row>
						{/*this.state.voters.map((voter, idx) => (
		          <Row className="voter-input">
		          	<Col md={6}>
			            <FormControl
			              type="text"
			              placeholder={`Voter #${idx + 1} address`}
			              value={voter.address}
			              onChange={this.handleVoterChange(idx)}
			            />
			          </Col>
			          <Col>
			            <Button bsStyle="danger" onClick={this.handleRemoveVoter(idx)}>
			            	<Glyphicon glyph="trash"/>
		            	</Button>
	            	</Col>
		          </Row>
		        ))
	        	<Button bsStyle="primary" onClick={this.handleAddVoter}>Add Voter</Button>*/}
	        </FormGroup>
	        <FormGroup>
						<Row>
							<p> Enter candidate names </p>	
						</Row>

						{this.state.candidates.map((candidate, idx) => (
		          <Row className="candidate-input">
		          	<Col md={6}>
			            <FormControl
			              type="text"
			              placeholder={`Candidate #${idx + 1} Name`}
			              value={candidate.name}
			              onChange={this.handleCandidateChange(idx)}
			            />
			          </Col>
			          <Col>
			            <Button bsStyle="danger" onClick={this.handleRemoveCandidate(idx)}>
			            	<Glyphicon glyph="trash"/>
		            	</Button>
	            	</Col>
		          </Row>
		        ))}
        		<Button bsStyle="primary" onClick={this.handleAddCandidate}>Add Candidate</Button>
		      </FormGroup>
		      <FormGroup inline>
		        <Row>
	        		<ControlLabel> Select starting date and time</ControlLabel>
	        	</Row>
	        	<Row>      
		        	<Col md={6}>
								<Datetime 
								defaultValue={new Date()}
								onChange={this.handleStartDateChange}
								dateFormat="D MMMM YYYY"
								isValidDate={this.isValidStartDate}
								/>
		        	</Col>
						</Row>
		        <Row>
	        		<ControlLabel> Select end date and time</ControlLabel>
	        	</Row>
	        	<Row>      
		        	<Col md={6}>
								<Datetime 
								id="end-date"
								defaultValue={new Date()}
								onChange={this.handleEndDateChange}
								dateFormat="D MMMM YYYY"
								isValidDate={this.isValidEnd}
								/>
		        	</Col>
						</Row>
						<Button bsStyle="primary" onClick={this.createVoting}>
						Create a voting
						</Button>
					</FormGroup>
				</Form>
				<div className="contract-info">
					<h2> Voter Number is</h2>
		          <Row className="voter-count">
		          	<p> Voter Count: {this.state.voterCount} </p>
		          </Row>
					<h2> Candidates are</h2>
						{this.state.candidates.map((candidate, idx) => (
		          <Row className="candidate-{idx}">
		          	<p> Candidate {idx}: {candidate.name} </p>
		          </Row>
		        ))}
		      <h2> Start Date is </h2>
		      	<Row> {this.state.startDate} </Row>
		      <h2> End Date is </h2>
		      	<Row> {this.state.endDate} </Row>
				</div>
			</Grid>
		</div>
		)
	}
}

export default CreateVoting