import { gql } from 'graphql-tag'
import Button from 'react-bootstrap/Button'
import InputGroup from 'react-bootstrap/InputGroup'
import { getGetServerSideProps } from '@/api/ssrApollo'
import { Form, Input, SubmitButton } from '@/components/form'
import Layout from '@/components/layout'
import { useQuery } from '@apollo/client'
import Link from 'next/link'
import { amountSchema } from '@/lib/validate'
import { numWithUnits } from '@/lib/format'
import PageLoading from '@/components/page-loading'
import { useShowModal } from '@/components/modal'
import dynamic from 'next/dynamic'
import { FAST_POLL_INTERVAL, SSR } from '@/lib/constants'
import { useToast } from '@/components/toast'
import { useFireworks } from '@/components/fireworks'
import { Col, Row } from 'react-bootstrap'
import { useData } from '@/components/use-data'
import { GrowthPieChartSkeleton } from '@/components/charts-skeletons'
import { useMemo } from 'react'
import { CompactLongCountdown } from '@/components/countdown'
import { usePaidMutation } from '@/components/use-paid-mutation'
import { DONATE } from '@/fragments/paidAction'
import { ITEM_FULL_FIELDS } from '@/fragments/items'
import { ListItem } from '@/components/items'

const GrowthPieChart = dynamic(() => import('@/components/charts').then(mod => mod.GrowthPieChart), {
  loading: () => <GrowthPieChartSkeleton />
})

const REWARDS_FULL = gql`
${ITEM_FULL_FIELDS}
{
  rewards {
    total
    time
    sources {
      name
      value
    }
    ad {
      ...ItemFullFields
    }
  }
}
`

const REWARDS = gql`
{
  rewards {
    total
    time
    sources {
      name
      value
    }
  }
}
`

export const getServerSideProps = getGetServerSideProps({ query: REWARDS_FULL })

export function RewardLine ({ total, time }) {
  return (
    <>
      <span style={{ whiteSpace: 'nowrap' }}>
        {numWithUnits(total)} in rewards
      </span>
      {time &&
        <small style={{ whiteSpace: 'nowrap' }}>
          <CompactLongCountdown
            className='text-monospace'
            date={time}
          />
        </small>}
    </>
  )
}

export default function Rewards ({ ssrData }) {
  // only poll for updates to rewards
  const { data: rewardsData } = useQuery(
    REWARDS,
    SSR ? {} : { pollInterval: FAST_POLL_INTERVAL, nextFetchPolicy: 'cache-and-network' })
  const { data } = useQuery(REWARDS_FULL)
  const dat = useData(data, ssrData)

  let { rewards: [{ total, sources, time, ad }] } = useMemo(() => {
    return dat || { rewards: [{}] }
  }, [dat])

  if (rewardsData?.rewards?.length > 0) {
    total = rewardsData.rewards[0].total
    sources = rewardsData.rewards[0].sources
    time = rewardsData.rewards[0].time
  }

  if (!dat) return <PageLoading />

  return (
    <Layout footerLinks>
      {ad &&
        <div className='pt-3 align-self-center' style={{ maxWidth: '500px', width: '100%' }}>
          <div className='fw-bold text-muted pb-2'>
            top boost this month
          </div>
          <ListItem item={ad} ad />
        </div>}
      <Row className='pb-3'>
        <Col>
          <div
            className='d-flex flex-column sticky-lg-top py-5'
          >
            <h3 className='text-center text-muted'>
              <div>
                <RewardLine total={total} time={time} />
              </div>
              <Link href='/faq#how-do-i-earn-sats-on-stacker-news' className='text-info fw-normal'>
                <small><small><small>learn about rewards</small></small></small>
              </Link>
            </h3>
            <div className='my-3 w-100'>
              <GrowthPieChart data={sources} />
            </div>
            <DonateButton />
          </div>
        </Col>
      </Row>
    </Layout>
  )
}

export function DonateButton () {
  const showModal = useShowModal()
  const toaster = useToast()
  const strike = useFireworks()
  const [donateToRewards] = usePaidMutation(DONATE)

  return (
    <>
      <Button
        onClick={() => showModal(onClose => (
          <Form
            initial={{
              amount: 10000
            }}
            schema={amountSchema}
            onSubmit={async ({ amount }) => {
              const { error } = await donateToRewards({
                variables: {
                  sats: Number(amount)
                },
                onCompleted: () => {
                  strike()
                  toaster.success('donated')
                }
              })
              onClose()
              if (error) throw error
            }}
          >
            <Input
              label='amount'
              name='amount'
              type='number'
              required
              autoFocus
              append={<InputGroup.Text className='text-monospace'>sats</InputGroup.Text>}
            />
            <div className='d-flex'>
              <SubmitButton variant='success' className='ms-auto mt-1 px-4' value='TIP'>donate</SubmitButton>
            </div>
          </Form>
        ))}
        className='align-self-center'
      >DONATE TO REWARDS
      </Button>
    </>
  )
}
