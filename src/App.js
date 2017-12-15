import React, { Component } from 'react';

const proxyUrl = 'https://192.168.1.14:3001/api/ils/';
// const proxyUrl = 'http://ilsmart.definite-software.com:3000/api/ils/';

const actionInfos = {
  IsPartAvailable: {
    form: IsPartAvailableForm,
    display: IsPartAvailableDisplay,
  },
  GetPartsAvailability: {
    form: GetPartsAvailabilityForm,
    display: GetPartsAvailabilityDisplay,
  },
};

function callProxy(options, callback) {
  const actionUrl = proxyUrl+options.action;

  return fetch(actionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(options.data),
  }).then(checkStatus)
    .then(parseJSON)
    .then(callback);
}

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }
  const error = new Error(`HTTP Error ${response.statusText}`);
  error.status = response.statusText;
  error.response = response;
  console.log(error); // eslint-disable-line no-console
  throw error;
}

function parseJSON(response) {
  return response.json();
}

function ErrorsDisplay(props) {
  if (!props.errors || !props.errors.Fault) {
    return null;
  }

  let listItems;

  if (props.errors.Fault.map) {
    listItems = props.errors.Fault.map((fault, index) =>
      <li key={index}>{fault.Message}</li>
    );
  } else {
    listItems = <li key="0">{props.errors.Fault.Message}</li>;
  }

  return (
    <ul>{listItems}</ul>
  );
}

function WaitingIndicator(props) {
  if (!props.waiting) {
    return null;
  }

  return (
    <p>Calling ILS..</p>
  );
}

function IsPartAvailableForm(props) {
  return (
    <form onSubmit={props.handleSubmit}>
      <label>
        UserId <input name="UserId" type="text" />
      </label>

      <label>
        Password <input name="Password" type="text" />
      </label>

      <label>
        PN <input name="PartNumber" type="text" />
      </label>

      <button type="submit">Submit</button>
    </form>
  );
}

function IsPartAvailableDisplay(props) {
  if (!props.body || !props.body.IsAvailable) {
    return null;
  }

  const msg = (JSON.parse(props.body.IsAvailable))
    ? 'Available'
    : 'Not Available';

  return (
    <p>{msg}</p>
  );
}

function GetPartsAvailabilityForm(props) {
  return (
    <form onSubmit={props.handleSubmit}>
      <label>
        UserId <input name="UserId" type="text" />
      </label>

      <label>
        Password <input name="Password" type="text" />
      </label>

      <label>
        PN <input name="PartNumber" type="text" />
      </label>

      <button type="submit">Submit</button>
    </form>
  );
}

function CompanyAddress(props) {
  if (!props.data) {
    return null;
  }

  return (
    <section>
      <p>{props.data.Address1}</p>
      <p>{props.data.Address2}</p>
      <p>{props.data.City}, {props.data.StateProvince} {props.data.PostalCode}</p>
      <p>{props.data.Country}</p>
    </section>
  );
}

function GetPartsAvailabilityDisplay(props) {
  if (!props.body || !props.body.PartListings) {
    return null;
  }

  let listItems;

  if (props.body.PartListings.PartListings.map) {
    // companies = props.body.PartListings.PartListings.map((listing, index) => ({
    //   id: listing.Company.Id,
    //   name: listing.Company.Name,
    // }));

    listItems = props.body.PartListings.PartListings.map((listing, index) =>
      <li key={index}>
        {listing.Company.Name}
        <CompanyAddress data={listing.Company.CompanyAddress} />
      </li>
    );
  } else {
    listItems = <li key="0">{props.body.PartListings.PartListings.Company.Name}</li>;
  }

  return (
    <ul>{listItems}</ul>
  );
}

function withILSProxy(actionName, actionInfo) {
  return class extends Component {
    constructor(props) {
      super(props);

      this.handleSubmit = this.handleSubmit.bind(this);

      this.state = {
        body: null,
        faults: null,
        waiting: false,
      };
    }

    handleSubmit(event) {
      event.preventDefault();

      // filter out elements without a name and convert the array to an object
      const formData = Array.from(event.target.elements)
        .filter(el => el.name)
        .reduce((a, b) => ({...a, [b.name]: b.value}), {});

      const options = {
        data: formData,
        action: actionName,
      };

      const callback = (res) => {
        const { Faults, ...body } = res.Body;
        this.setState({body: body, faults: Faults, waiting: false});
      };

      this.setState({waiting: true});
      callProxy(options, callback);
    }

    render() {
      const FormComponent = actionInfo.form;
      const DisplayComponent = actionInfo.display;

      return (
        <div>
          <WaitingIndicator waiting={this.state.waiting} />
          <ErrorsDisplay errors={this.state.faults} />
          <FormComponent handleSubmit={this.handleSubmit} {...this.props} />
          <DisplayComponent body={this.state.body} />
        </div>
      );
    }
  }
}

class App extends Component {
  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);

    this.state = {
      ilsUser: null,
      ilsPass: null,
      ilsAuth: false,
      action: 'IsPartAvailable',
    };
  }

  handleChange(event) {
    this.setState({action: event.target.value});
  }

  render() {
    const actionName = this.state.action;
    const actionInfo = actionInfos[actionName];
    const ActionView = withILSProxy(actionName, actionInfo);

    return (
      <div className="App">
        <section>
          <label>
            Select an Action
            <select value={actionName} onChange={this.handleChange}>
              <option value="IsPartAvailable">IsPartAvailable</option>
              <option value="GetPartsAvailability">GetPartsAvailability</option>
            </select>
          </label>
        </section>

        <section>
          <ActionView />
        </section>
      </div>
    );
  }
}

export default App;
