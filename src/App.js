import React, { Component } from 'react'
import './App.css'
import Autocomplete from 'react-autocomplete'
import { YMaps, Map, ObjectManager, Button } from 'react-yandex-maps'

const API_HH_URL = 'https://api.hh.ru/'

const VacanciesTable = ({vacancies, isLoading}) => {
  const vacanciesRow = vacancies.map(vacancy => (
      <tr key={vacancy.id}>
        <td><a href={vacancy.alternate_url}>{vacancy.name.slice(0,50)}</a></td>
        <td>{vacancy.employer.name}</td>
        <td>{new Date(vacancy.published_at).toLocaleString('ru', {year: 'numeric', month: 'numeric', day: 'numeric'})}</td>
        <td>{vacancy.salary !== null ? (`${vacancy.salary.from} ${vacancy.salary.currency}`) : 'Не указана'}</td>
      </tr>
    ),
  )
  return (
    <table>
      <thead>
      <tr className='header'>
        <td>Должность</td>
        <td>Компания</td>
        <td>Дата</td>
        <td>Оклад</td>
      </tr>
      </thead>
      <tbody>
        {isLoading ? <tr><td colSpan="4">Loading...</td></tr> : vacanciesRow}
      </tbody>
    </table>
  )
}

const PlacemarkMap = ({vacancies}) => {
  const mapState = { center: [55.76, 37.64], zoom: 12 }
  const mapData = vacancies
    .filter( vacancy => {
    return vacancy.address != null && vacancy.address.lat != null && vacancy.address.lng != null
  })
    .map(vacancy => {
    return (
      {
        type: "Feature",
        id: vacancy.id,
        geometry: {
          type: "Point",
          coordinates: [vacancy.address.lat, vacancy.address.lng]
        },
        properties:{
          balloonContentHeader: vacancy.name,
          balloonContentBody:"<a href="+vacancy.alternate_url+" target=_blank>"+vacancy.employer.name+"</a>",
          balloonContentFooter:(vacancy.salary != null && vacancy.salary.from != null &&  "от "+vacancy.salary.from ) || "Не указана" ,
          clusterCaption: vacancy.name,
          hintContent: vacancy.name
        },
        options: {
          preset: "islands#blueCircleDotIconWithCaption",
          iconCaptionMaxWidth: "100"
        }
      }
    )
  })
  return (
    <YMaps>
      <Map state={mapState} width={'99%'} height={500}>
        <Button data={{ content: "Количество ваканский на карте " + mapData.length }} options={{ float: 'right', maxWidth: '100%' }} />
        <ObjectManager
          options={{
            clusterize: true,
            gridSize: 32,
          }}
          objects={{
            preset: 'islands#blueDotIcon',
          }}
          clusters={{
            preset: 'islands#blueClusterIcons',
          }}
          features={mapData}
        />
      </Map>
    </YMaps>
  )
}

class App extends Component {
  state = {
    vacancies: [],
    specializations: [],
    metroStations: [],
    vacancyValue: '',
    metroValue: '',
    isLoading: false,
  }

  componentDidMount() {
    this.getSpecializationsData()
    this.getMetroData()
  }

  getSpecializationsData() {
    fetch(`${API_HH_URL}specializations`)
      .then(response => response.json())
      .then(data => {
        let labels = []
        for (const el of data) {
          for (const specialization of el.specializations) {
            labels.push({
              label: specialization.name,
              specialization: el.name,
              id: specialization.id,
            })
          }
        }
        this.setState({specializations: labels})
      })
      .catch(e => e)
  }

  getMetroData() {
    fetch(`${API_HH_URL}metro/1`)
      .then(response => response.json())
      .then(data => {
        let stations = []
        for (const line of data.lines) {
          for (const station of line.stations) {
            stations.push({
              label: station.name,
              line: line.name,
              id: station.id,
            })
          }
        }
        this.setState({metroStations: stations})
      })
      .catch(e => e)
  }

  handleSubmit = () => {
    const vacancyValue = this.state.vacancyValue
    const filteredMetro = this.state.metroStations.filter(el => el.label === this.state.metroValue)
    const metroQuery = filteredMetro.length > 0
      ? `&metro=${filteredMetro.shift().id}`
      : ''
    const vacanciesUrl = `${API_HH_URL}vacancies?area=1&text=${vacancyValue}${metroQuery}`
    this.setState({isLoading: true})
    fetch(vacanciesUrl)
      .then(response => response.json())
      .then(data => this.setState({vacancies: data.items, isLoading: false}))
      .catch(e => e)
}

  render() {
    return (
      <div className="container">
        <h3>Ярмарка вакансий</h3>
        <Autocomplete
          getItemValue={(item) => item.label}
          shouldItemRender={(item, value) => item.label.toLowerCase().includes(value.toLowerCase())}
          items={this.state.specializations}
          renderItem={(item, isHighlighted) =>
            <div
              key={item.id}
              style={{ background: isHighlighted ? 'lightgray' : 'white' }}>
              {item.label} [{item.specialization}]
            </div>
          }
          value={this.state.vacancyValue}
          onChange={(event, value) => this.setState({ vacancyValue: value })}
          onSelect={value => this.setState({ vacancyValue: value })}
          renderInput={(props) => <input id='inputVacancy' placeholder='Выберите должность...' {...props} />}
          wrapperStyle={{ position: 'relative', display: 'inline-block', zIndex: '9999' }}
        />
        <Autocomplete
          getItemValue={(item) => item.label}
          shouldItemRender={(item, value) => item.label.toLowerCase().includes(value.toLowerCase())}
          items={this.state.metroStations}
          renderItem={(item, isHighlighted) =>
            <div
              key={item.id}
              style={{ background: isHighlighted ? 'lightgray' : 'white' }}>
              {item.label} [{item.line}]
            </div>
          }
          value={this.state.metroValue}
          onChange={(event, value) => this.setState({ metroValue: value })}
          onSelect={value => this.setState({ metroValue: value })}
          renderInput={(props) => <input id='inputMetro' placeholder='Выберите станцию...' {...props} />}
          wrapperStyle={{ position: 'relative', display: 'inline-block', zIndex: '9999' }}
        />
        <button onClick={this.handleSubmit} className='searchButton'>Поиск</button>
        <PlacemarkMap vacancies={this.state.vacancies}/>
        <div>
          {
            this.state.vacancies.length > 0
            && <VacanciesTable
              vacancies={this.state.vacancies}
              isLoading={this.state.isLoading}/>
          }
        </div>
      </div>
    )
  }
}

export default App;
