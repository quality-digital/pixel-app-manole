import { canUseDOM } from 'vtex.render-runtime'
import type { PixelMessage } from './typings/events'

declare global {
  interface Window {
    InsiderQueue?: any;
  }
}

let page_type: string | null = null

let insiderEventBuffer: any[] = []
let insiderInitTimeout: ReturnType<typeof setTimeout> | null = null

function flushInsiderEvents() {
  if (insiderEventBuffer.length > 0) {
    insiderEventBuffer.forEach(evt => window.InsiderQueue!.push(evt))
    insiderEventBuffer = []

    window.InsiderQueue!.push({ type: 'init' })

    injectInsiderScript()
  }
}




function pushInsiderEventBuffered(event: any) {
  insiderEventBuffer.push(event)
  if (insiderInitTimeout) clearTimeout(insiderInitTimeout)
  insiderInitTimeout = setTimeout(() => {
    flushInsiderEvents()
  }, 2000)
}

function injectInsiderScript() {
  if (window.InsiderQueue) {
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://manole.api.useinsider.com/ins.js?id=10012431'
    document.head.appendChild(script)
  }
}

function getPageName(input: string) {
  if (!input) return null
  const parts = input.split(/[.#]/)
  if (parts.length === 1) {
    return parts[0] || null
  }
  if (input.includes('#')) {
    return parts[2] || null
  }
  if (input.includes('.')) {
    return parts[1] || null
  }
  return null
}

function getProductImageUrl(imagens: string | undefined) {
  if (!imagens) {
    return
  }
  return imagens.split('?')[0]
}

function extractCategoryNames(categories: any) {
  if (!categories) {
    return []
  }
  return categories.map((category: { name: any }) => category.name)
}

function formatPathSegments(url: any) {
  let path = ''
  try {
    path = new URL(url).pathname
  } catch (e) {
    console.warn('Invalid URL:', url)
    return []
  }
  const segments = path.split('/').filter(segment => segment && segment !== '__bindingAddress')
  const formatted = segments.map(segment => {
    let formattedSegment = segment.replace(/-/g, ' ')
    formattedSegment = formattedSegment
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    if (formattedSegment === 'Cursos Na Area Da Saude') {
      return 'Curso na área da saúde'
    }
    return formattedSegment
  })
  return formatted
}

/*Add to CART*/
function getViewItemEvent(eventDataLayer: any, dataLayer: any) {
  for (let i = dataLayer.length - 1; i >= 0; i--) {
    if (dataLayer[i].event === eventDataLayer) {
      return dataLayer[i]
    }
  }
  return null
}

function formatCurrencyValue(valor: any) {
  if (valor === undefined || valor === null) {
    return ''
  }
  let str = valor.toString() ? valor.toString() : valor
  let zerosFinais = 0
  for (let i = str.length - 1; i >= 0; i--) {
    if (str.charAt(i) === '0') {
      zerosFinais++
    } else {
      break
    }
  }
  if (zerosFinais >= 2) {
    str = str.substring(0, str.length - 2)
    return str
  }
  if (zerosFinais === 1) {
    let base = str.substring(0, str.length - 1)
    if (base.length === 1) {
      return '0.' + base
    }
    return base.substring(0, base.length - 1) + '.' + base.substring(base.length - 1)
  }
  if (str.length <= 2) {
    return '0.' + (str.length === 1 ? '0' + str : str)
  }
  return str.substring(0, str.length - 2) + '.' + str.substring(str.length - 2)
}

function getProductImageUrlCart(imageProduct: any) {
  return imageProduct ? imageProduct.split('-')[0] : null
}

function shipping(orderForm: any) {
  var shipping = null
  var totalizers = orderForm.totalizers
  for (var i = 0; i < totalizers.length; i++) {
    if (totalizers[i].id === 'Shipping') {
      return (shipping = totalizers[i].value)
    }
    if (shipping !== null) {
      return shipping
    } else {
      return 0
    }
  }
}

function sendEventInside(eventName: string, data: any) {
  switch (eventName) {
    case 'home': {
      pushInsiderEventBuffered({ type: 'home' })
      pushInsiderEventBuffered({ type: 'currency', value: 'BRL' })
      break
    }

    case 'product': {
      let objectUser = {
        id: data?.product?.selectedSku?.itemId,
        name: data?.product?.productName,
        taxonomy: extractCategoryNames(data.product?.categoryTree),
        unit_sale_price: data?.product?.selectedSku?.sellers[0].commertialOffer?.Price || 0,
        unit_price: data?.product?.selectedSku?.sellers[0].commertialOffer?.PriceWithoutDiscount || 0,
        url: window.location.origin + data?.product?.detailUrl,
        product_image_url: getProductImageUrl(data?.product?.selectedSku?.imageUrl),
        custom: {
          isbn: data?.product?.selectedSku?.ean,
          ean: data?.product?.selectedSku?.ean,
          modalidade: data?.product?.selectedSku.name,
        },
      }

      pushInsiderEventBuffered({ type: 'product', value: objectUser })
      pushInsiderEventBuffered({ type: 'currency', value: data?.currency || 'BRL' })

      injectInsiderScript()
      break
    }

    case 'subcategory': {
      let formattedPaths: any = formatPathSegments(data.pageUrl)
      if (!formattedPaths || formattedPaths.length === 0) {
        return
      }
      pushInsiderEventBuffered({ type: 'category', value: formattedPaths })
      break
    }

    case 'department': {
      let formattedPaths: any = formatPathSegments(data.pageUrl)
      if (!formattedPaths || formattedPaths.length === 0) {
        return
      }
      pushInsiderEventBuffered({ type: 'category', value: formattedPaths })
      break
    }

    case 'addToCart': {
      let viewItemEvent = getViewItemEvent('add_to_cart', window.dataLayer)
      let arrayTaxonomy = []
      let product: any
      viewItemEvent = null
      if (viewItemEvent && viewItemEvent.ecommerce && viewItemEvent.ecommerce.items === undefined && viewItemEvent.ecommerce.items.length === 0) {
        product = viewItemEvent.ecommerce.items[0]

        if (product.item_category) arrayTaxonomy.push(product.item_category)
        if (product.item_category2) arrayTaxonomy.push(product.item_category2)
        if (product.item_category3) arrayTaxonomy.push(product.item_category3)
      }
      if (!viewItemEvent) {
        arrayTaxonomy.push(...data.category.split('/'))
      }

      let productDataToSend: any
      productDataToSend = {
        id: product ? product.item_variant : data.skuId,
        img: getProductImageUrlCart(data.imageUrl),
        unit_sale_price: data.sellingPrice ? parseFloat(formatCurrencyValue(data.sellingPrice)) : null,
        unit_price: parseFloat(formatCurrencyValue(data.price)),
        quantity: data.quantity,
        custom: {
          isbn: data.ean,
          ean: data.ean,
          modalidade: data.variant,
        },
      }
      let storageData: any = localStorage.getItem('imgAddToCart')
      let imgAddToCart = JSON.parse(storageData)
      let imgAddToCartNew: any
      let imgAddToCartNewEquals: any
      let existingItem: any
      let unitePrice: any = 0
      if (storageData) {
        imgAddToCartNew = imgAddToCart.filter((item: any) => item.id !== productDataToSend.id && item.unit_sale_price)

        if (imgAddToCartNew.id !== productDataToSend.id && imgAddToCartNew.unit_sale_price) {
          return
        }
        if (imgAddToCartNew.id !== productDataToSend.id && productDataToSend.unit_sale_price) {
          localStorage.setItem('imgAddToCart', JSON.stringify([...imgAddToCart, productDataToSend]))
        }
        imgAddToCartNewEquals = imgAddToCart.filter((item: any) => item.id === productDataToSend.id && item.unit_sale_price)
        if (imgAddToCartNewEquals.length > 0 && imgAddToCartNewEquals[0].id === productDataToSend.id && imgAddToCartNewEquals[0].unit_sale_price) {
          imgAddToCartNew = [productDataToSend]
        }
      }

      if (storageData) {
        existingItem = imgAddToCart.find(
          (item: any) => item.id === productDataToSend.id && item.unit_sale_price
        )

        if (existingItem) {
          existingItem.quantity = (existingItem.quantity || 1) + 1
          localStorage.setItem('imgAddToCart', JSON.stringify(imgAddToCart))
          imgAddToCartNew = [existingItem]
          unitePrice = existingItem.unit_price
        }
      }

      if (!storageData) {
        let newArray = [productDataToSend]
        localStorage.setItem('imgAddToCart', JSON.stringify(newArray))
      }

      let unitSale =
        imgAddToCartNew && imgAddToCartNew.find((item: any) => item.id === data.skuId)
          ? imgAddToCartNew.find((item: any) => item.id === data.skuId).unit_sale_price
          : productDataToSend.unit_sale_price

      window.InsiderQueue!.push({
        type: 'currency',
        value: 'BRL',
      })
      window.InsiderQueue!.push({
        type: 'add_to_cart',
        value: {
          id: data.skuId,
          name: data.name,
          taxonomy: arrayTaxonomy,
          unit_price: parseFloat(existingItem ? existingItem.unit_price : formatCurrencyValue(data.price)),
          url: 'https://' + window.location.hostname + data.detailUrl,
          unit_sale_price: unitSale ? unitSale : unitePrice,
          quantity: data.quantity,
          product_image_url: getProductImageUrlCart(data.imageUrl),
          custom: {
            isbn: data.ean ? data.ean : imgAddToCartNew[0].custom.isbn,
            ean: data.ean ? data.ean : imgAddToCartNew[0].custom.ean,
            modalidade: data.variant,
          },
        },
      })
      injectInsiderScript()
      break
    }

    case 'remove_from_cart': {
      let viewItemEvent = getViewItemEvent('remove_from_cart', window.dataLayer)

      if (!viewItemEvent && !viewItemEvent.ecommerce && !viewItemEvent.ecommerce.items && !viewItemEvent.ecommerce.items.length) {
        console.warn('Product data not found in dataLayer')
        break
      }

      let product = viewItemEvent.ecommerce.items[0]
      let arrayTaxonomy = []

      if (product.item_category) arrayTaxonomy.push(product.item_category)
      if (product.item_category2) arrayTaxonomy.push(product.item_category2)
      if (product.item_category3) arrayTaxonomy.push(product.item_category3)

      let storageData: any = localStorage.getItem('imgAddToCart')
      let imgAddToCart = JSON.parse(storageData)

      let itemId = product.item_variant
      let unit_price: any = ''
      let unit_sale_price: any = ''
      let custom: any = {}

      for (var i = 0; i < imgAddToCart.length; i++) {
        if (imgAddToCart[i].id === itemId) {
          unit_price = imgAddToCart[i].unit_price
          unit_sale_price = imgAddToCart[i].unit_sale_price
          custom = imgAddToCart[i].custom
          break
        }
      }

      let newStorage = []
      for (var j = 0; j < imgAddToCart.length; j++) {
        if (imgAddToCart[j].id !== itemId) {
          newStorage.push(imgAddToCart[j])
        }
        if (imgAddToCart[j].id === itemId) {
          if (imgAddToCart[j].quantity === 0) {
            return
          } else {
            imgAddToCart[j].quantity - 1
            newStorage.push(imgAddToCart[j])
          }
        }
      }
      let existingItem: any

      if (storageData) {
        existingItem = newStorage.find((item: any) => item.id === itemId && item.quantity > 0)
      }
      if (existingItem) {
        if (existingItem.quantity === 0) {
          newStorage = newStorage.filter((item: any) => item.id !== itemId)
        } else {
          newStorage = newStorage.map(item =>
            item.id === itemId
              ? { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 1 }
              : item
          )
        }
      }
      localStorage.setItem('imgAddToCart', JSON.stringify(newStorage))
      window.InsiderQueue!.push({
        type: 'currency',
        value: 'BRL',
      })

      window.InsiderQueue!.push({
        type: 'remove_from_cart',
        value: {
          id: data.skuId,
          name: data.name,
          taxonomy: arrayTaxonomy,
          unit_price: unit_price,
          quantity: data.quantity,
          unit_sale_price: unit_sale_price ? unit_sale_price : 0,
          url: 'https://' + window.location.hostname + data.detailUrl,
          product_image_url: getProductImageUrlCart(data.imageUrl),
          custom: custom,
        },
      })
      break
    }

    case 'viewCart': {
      let newItems: any = []
      let dataOrderForm: any = localStorage.getItem('orderform')
      let orderForm = JSON.parse(dataOrderForm) || []

      if (!data) {
        break
      }
      data.forEach((item: any) => {
        const taxonomy = item.category.split('/').map((i: any) => i.trim())
        const orderItem = orderForm.items.find((d: any) => d.id === item.skuId)

        if (orderItem) {
          newItems.push({
            id: item.skuId,
            name: item.name,
            taxonomy: taxonomy,
            unit_price: parseFloat(formatCurrencyValue(orderItem.price)),
            unit_sale_price: parseFloat(formatCurrencyValue(orderItem.sellingPrice)),
            url: 'https://' + window.location.hostname + item.detailUrl,
            product_image_url: item.imageUrl,
            quantity: item.quantity,
          })
        }
      })

      pushInsiderEventBuffered({
        type: 'cart',
        value: {
          total: parseFloat(formatCurrencyValue(orderForm.value)),
          shipping_cost: shipping(orderForm),
          items: newItems,
        },
      })
      pushInsiderEventBuffered({
        type: 'currency',
        value: 'BRL',
      })

      injectInsiderScript()
      break
    }

    case 'user': {
      if (data.isAuthenticated) {
        const intervalId = setInterval(() => {
          let getInsiderQueueUse: any = localStorage.getItem('insiderQueue')
          if (getInsiderQueueUse) {
            let InsiderUserObj = JSON.parse(getInsiderQueueUse)
            InsiderUserObj.value.custom = {
              cpf: InsiderUserObj.value.document,
            }

            pushInsiderEventBuffered(InsiderUserObj)
            pushInsiderEventBuffered({
              type: 'set_custom_identifier',
              value: {
                cpf: InsiderUserObj.value.document,
              },
            })

            injectInsiderScript()
            clearInterval(intervalId)
          }
        }, 500)
      }
      break
    }
  }
}

export function handleEvents(e: PixelMessage) {
  if (e.data.eventName === undefined || e.data.eventName === null) return
  switch (e.data.eventName) {
    case 'vtex:pageView': {
      const pageType = getPageName((e.data as any).routeId)

      switch (pageType) {
        case 'home': {
          window.InsiderQueue = window.InsiderQueue || []
          sendEventInside('home', e.data)
          page_type = 'home'
          break
        }
        case 'subcategory': {
          window.InsiderQueue = window.InsiderQueue || []
          sendEventInside('subcategory', e.data)
          page_type = 'category'
          break
        }

        case 'department': {
          window.InsiderQueue = window.InsiderQueue || []
          sendEventInside('department', e.data)
          page_type = 'category'
          break
        }
      }
      break
    }
    case 'vtex:productView': {
      window.InsiderQueue = window.InsiderQueue || []
      sendEventInside('product', e.data)
      page_type = 'product'
      break
    }

    case 'vtex:addToCart': {
      const { items } = e.data
      window.InsiderQueue = window.InsiderQueue || []
      sendEventInside('addToCart', items[0])
      break
    }
    case 'vtex:removeFromCart': {
      const { items } = e.data
      window.InsiderQueue = window.InsiderQueue || []
      sendEventInside('remove_from_cart', items[0])
      break
    }

    case 'vtex:viewCart': {
      const { items } = e.data
      window.InsiderQueue = window.InsiderQueue || []
      sendEventInside('viewCart', items)
      break
    }
    case 'vtex:userData': {
      const { data } = e

      if (!data.isAuthenticated) {
        return
      }

      const waitForPageType = (callback: () => void) => {
        if (page_type) {
          callback()
        } else {
          setTimeout(() => waitForPageType(callback), 100)
        }
      }

      waitForPageType(() => {
        window.InsiderQueue = window.InsiderQueue || []

        console.log('User data received:', data)
        sendEventInside('user', data)
      })
      break
    }
    case 'vtex:orderPlaced': {
      window.InsiderQueue = window.InsiderQueue || []
      const order: any = e.data
      var localStorageData = localStorage.getItem('ObjectInsiderPurchase')
      var objectInsider = localStorageData ? JSON.parse(localStorageData) : false
      if (objectInsider || order) {

        order?.transactionProducts.forEach((product: any) => {
          const match = objectInsider.items.find((item: any) => item.id === product.id)
          if (match) {
            match.unit_price = product.originalPrice
            match.unit_sale_price = product.sellingPrice
          }
        })

        objectInsider.order_id = order?.ordersInOrderGroup[0]
        objectInsider.total = order?.transactionTotal


        window.InsiderQueue.push({
          type: 'purchase',
          value: objectInsider,
        })
        window.InsiderQueue.push({
          type: 'currency',
          value: 'BRL',
        })
        window.InsiderQueue.push({
          type: 'init',
        })
      }
      page_type = 'purchase'
      break
    }
    default: {
      break
    }
  }
}

if (canUseDOM) {
  window.addEventListener('message', handleEvents)
}
