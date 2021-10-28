import React from 'react'
import { Web3ReactProvider, useWeb3React, UnsupportedChainIdError } from '@web3-react/core'
import {
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected,
} from '@web3-react/injected-connector'
import { Web3Provider } from '@ethersproject/providers'
import { formatEther } from '@ethersproject/units'
import { Container, Button, Box, CircularProgress } from '@material-ui/core'
import CheckIcon from '@material-ui/icons/Check'

import { useEagerConnect, useInactiveListener } from '../hooks'
import { injected } from '../connectors'

function getErrorMessage(error: Error) {
  if (error instanceof NoEthereumProviderError) {
    return 'No Ethereum browser extension detected, install MetaMask on desktop or visit from a dApp browser on mobile.'
  } else if (error instanceof UnsupportedChainIdError) {
    return "You're connected to an unsupported network."
  } else if (error instanceof UserRejectedRequestErrorInjected) {
    return 'Please authorize this website to access your Ethereum account.'
  } else {
    console.error(error)
    return 'An unknown error occurred. Check the console for more details.'
  }
}

function getLibrary(provider: any): Web3Provider {
  const library = new Web3Provider(provider)
  library.pollingInterval = 12000
  return library
}

export default function () {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <App />
    </Web3ReactProvider>
  )
}

function Account() {
  const { account } = useWeb3React()

  return (
    <>
      <span>Address</span>
      <span role="img" aria-label="robot">
        🤖
      </span>
      <span>{account === null ? '-' : account ? `${account}` : ''}</span>
    </>
  )
}

function Balance() {
  const { account, library, chainId } = useWeb3React()

  const [balance, setBalance] = React.useState()
  React.useEffect((): any => {
    if (!!account && !!library) {
      let stale = false

      library
        .getBalance(account)
        .then((balance: any) => {
          if (!stale) {
            setBalance(balance)
          }
        })
        .catch(() => {
          if (!stale) {
            setBalance(null)
          }
        })

      return () => {
        stale = true
        setBalance(undefined)
      }
    }
  }, [account, library, chainId]) // ensures refresh if referential identity of library doesn't change across chainIds

  return (
    <>
      <span>Balance</span>
      <span role="img" aria-label="gold">
        💰
      </span>
      <span>{balance === null ? 'Error' : balance ? `Ξ${formatEther(balance)}` : ''}</span>
    </>
  )
}

function Header() {
  const { active, error } = useWeb3React()

  return (
    <>
      <h1 style={{ margin: '1rem', textAlign: 'right' }}>{active ? '🟢' : error ? '🔴' : '🟠'}</h1>
      <h3
        style={{
          display: 'grid',
          gridGap: '1rem',
          gridTemplateColumns: '1fr min-content 1fr',
          lineHeight: '2rem',
        }}
      >
        <Account />
        <Balance />
      </h3>
    </>
  )
}

function App() {
  const context = useWeb3React<Web3Provider>()
  const { connector, library, chainId, account, activate, deactivate, active, error } = context

  // handle logic to recognize the connector currently being activated
  const [activatingConnector, setActivatingConnector] = React.useState<any>()
  React.useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined)
    }
  }, [activatingConnector, connector])

  // handle logic to eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect()

  // handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector)

  const currentConnector = injected
  const activating = currentConnector === activatingConnector
  const connected = currentConnector === connector
  const disabled = !triedEager || !!activatingConnector || connected || !!error

  return (
    <Container>
      <Header />
      <Box display="flex" alignItems="center">
        <Button
          variant="contained"
          color="primary"
          disabled={disabled}
          onClick={() => {
            setActivatingConnector(currentConnector)
            activate(injected)
          }}
          startIcon={connected && <CheckIcon />}
        >
          {activating ? (
            <>
              <CircularProgress size={20} />
              <span style={{ marginLeft: '.5rem' }}>Activating</span>
            </>
          ) : (
            <>{connected ? 'Activated' : 'Activate'}</>
          )}
        </Button>
        {(active || error) && (
          <Button
            onClick={() => {
              deactivate()
            }}
            variant="contained"
            color="secondary"
            style={{ marginLeft: '1rem' }}
          >
            Deactivate
          </Button>
        )}
      </Box>
      <Box>{!!error && <h4 style={{ marginTop: '1rem', marginBottom: '0' }}>{getErrorMessage(error)}</h4>}</Box>
    </Container>
  )
}
